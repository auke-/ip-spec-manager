import { Injectable } from '@angular/core';
import { DiffLine, FileDiff, UnpackedFile } from '../models/gitlab.models';

@Injectable({
  providedIn: 'root'
})
export class DiffEngine {
  /**
   * Compare unpacked uploaded files with current repository files
   */
  computeDiffs(
    uploadedFiles: UnpackedFile[],
    existingRepoFiles: { path: string; content: string }[] = []
  ): FileDiff[] {
    const isMacArtifact = (p: string) => {
      const normalized = p.replace(/\\/g, '/').replace(/^\.\//, '');
      const segments = normalized.split('/');
      const fileName = segments[segments.length - 1];
      return segments[0] === '__MACOSX' || segments.includes('__MACOSX') || fileName.toLowerCase() === '.ds_store';
    };

    const existingFileMap = new Map<string, string>();
    for (const f of existingRepoFiles) {
      if (!isMacArtifact(f.path)) {
        existingFileMap.set(f.path, f.content);
      }
    }

    const uploadedMap = new Map<string, string>();
    for (const f of uploadedFiles) {
      if (!isMacArtifact(f.path)) {
        uploadedMap.set(f.path, f.content);
      }
    }

    const allPaths = new Set([...existingFileMap.keys(), ...uploadedMap.keys()]);
    const sortedPaths = Array.from(allPaths).sort();
    const results: FileDiff[] = [];

    for (const path of sortedPaths) {
      const oldContent = existingFileMap.get(path) ?? null;
      const newContent = uploadedMap.get(path) ?? null;

      if (oldContent === null && newContent !== null) {
        // File added
        const lines = newContent.split('\n');
        const diffLines: DiffLine[] = lines.map((line, idx) => ({
          type: 'add',
          newLineNumber: idx + 1,
          content: line
        }));

        results.push({
          path,
          changeType: 'added',
          oldContent: null,
          newContent,
          diffLines,
          additionsCount: lines.length,
          deletionsCount: 0
        });
      } else if (oldContent !== null && newContent === null) {
        // File deleted
        const lines = oldContent.split('\n');
        const diffLines: DiffLine[] = lines.map((line, idx) => ({
          type: 'remove',
          oldLineNumber: idx + 1,
          content: line
        }));

        results.push({
          path,
          changeType: 'deleted',
          oldContent,
          newContent: null,
          diffLines,
          additionsCount: 0,
          deletionsCount: lines.length,
          isBreakingChangeDetected: path.endsWith('.wsdl') || path.endsWith('.xsd') || path.includes('openapi'),
          breakingReason: `Deleted critical specification asset: ${path}`
        });
      } else if (oldContent !== null && newContent !== null) {
        // Both exist: check if identical or modified
        if (oldContent === newContent) {
          results.push({
            path,
            changeType: 'identical',
            oldContent,
            newContent,
            diffLines: [],
            additionsCount: 0,
            deletionsCount: 0
          });
        } else {
          // Compute line diff
          const { diffLines, additions, deletions, breaking, reason } = this.computeLineDiff(oldContent, newContent, path);
          results.push({
            path,
            changeType: 'modified',
            oldContent,
            newContent,
            diffLines,
            additionsCount: additions,
            deletionsCount: deletions,
            isBreakingChangeDetected: breaking,
            breakingReason: reason
          });
        }
      }
    }

    return results;
  }

  /**
   * Line diff algorithm with breaking change heuristics
   */
  private computeLineDiff(
    oldText: string,
    newText: string,
    path: string
  ): {
    diffLines: DiffLine[];
    additions: number;
    deletions: number;
    breaking: boolean;
    reason?: string;
  } {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');

    const diffLines: DiffLine[] = [];
    let additions = 0;
    let deletions = 0;

    // LCS (Longest Common Subsequence) based line differ
    const lcsMatrix = this.buildLcsMatrix(oldLines, newLines);
    let i = oldLines.length;
    let j = newLines.length;
    const tempDiff: DiffLine[] = [];

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
        tempDiff.unshift({
          type: 'context',
          oldLineNumber: i,
          newLineNumber: j,
          content: oldLines[i - 1]
        });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || lcsMatrix[i][j - 1] >= lcsMatrix[i - 1][j])) {
        tempDiff.unshift({
          type: 'add',
          newLineNumber: j,
          content: newLines[j - 1]
        });
        additions++;
        j--;
      } else if (i > 0 && (j === 0 || lcsMatrix[i][j - 1] < lcsMatrix[i - 1][j])) {
        tempDiff.unshift({
          type: 'remove',
          oldLineNumber: i,
          content: oldLines[i - 1]
        });
        deletions++;
        i--;
      }
    }

    diffLines.push(...tempDiff);

    // Heuristic detection of breaking changes in WSDL / OpenAPI
    let breaking = false;
    let reason: string | undefined;

    if (path.endsWith('.wsdl')) {
      const removedOps = diffLines
        .filter(d => d.type === 'remove' && /<(?:wsdl:)?operation\s+name\s*=\s*["']([^"']+)["']/i.test(d.content))
        .map(d => {
          const match = d.content.match(/<(?:wsdl:)?operation\s+name\s*=\s*["']([^"']+)["']/i);
          return match ? match[1] : '';
        })
        .filter(Boolean);

      if (removedOps.length > 0) {
        breaking = true;
        reason = `WSDL operation(s) removed: ${removedOps.join(', ')}`;
      }
    } else if (path.includes('openapi') || path.endsWith('.yaml') || path.endsWith('.json')) {
      const removedEndpoints = diffLines
        .filter(d => d.type === 'remove' && /^\s*(\/[-a-zA-Z0-9_{}/]+):/i.test(d.content))
        .map(d => {
          const match = d.content.match(/^\s*(\/[-a-zA-Z0-9_{}/]+):/i);
          return match ? match[1] : '';
        })
        .filter(Boolean);

      if (removedEndpoints.length > 0) {
        breaking = true;
        reason = `REST endpoint(s) removed from specification: ${removedEndpoints.join(', ')}`;
      }
    }

    return { diffLines, additions, deletions, breaking, reason };
  }

  private buildLcsMatrix(a: string[], b: string[]): number[][] {
    const m = a.length;
    const n = b.length;
    // Cap matrix computation if files are excessively large to maintain sub-100ms response
    if (m * n > 250000) {
      return this.approximateMatrix(a, b);
    }

    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }
    return dp;
  }

  private approximateMatrix(a: string[], b: string[]): number[][] {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 1; i <= Math.min(m, 500); i++) {
      for (let j = 1; j <= Math.min(n, 500); j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }
    return dp;
  }
}
