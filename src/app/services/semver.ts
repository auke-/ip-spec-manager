import { Injectable } from '@angular/core';
import { FileDiff, SemverAnalysis, SemverBumpType } from '../models/gitlab.models';

export interface ParsedSemver {
  raw: string;
  normalized: string; // without 'v'
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SemverService {
  private readonly SEMVER_REGEX = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/;

  /**
   * Parse a tag into SemVer components, returning null if not a valid semantic version
   */
  parseSemver(tag: string): ParsedSemver | null {
    if (!tag) return null;
    const trimmed = tag.trim();
    const match = trimmed.match(this.SEMVER_REGEX);
    if (!match) return null;

    const major = parseInt(match[1], 10);
    const minor = parseInt(match[2], 10);
    const patch = parseInt(match[3], 10);
    const prerelease = match[4] || undefined;
    const normalized = `${major}.${minor}.${patch}${prerelease ? `-${prerelease}` : ''}`;

    return {
      raw: trimmed,
      normalized,
      major,
      minor,
      patch,
      prerelease
    };
  }

  /**
   * Strict SemVer 2.0 comparator:
   * Returns > 0 if a > b, < 0 if a < b, 0 if equal.
   * e.g. 2.1.0 > 1.9.9, 2.0.0 > 2.0.0-rc.1
   */
  compareSemver(tagA: string, tagB: string): number {
    const a = this.parseSemver(tagA);
    const b = this.parseSemver(tagB);

    if (!a && !b) return 0;
    if (!a) return -1;
    if (!b) return 1;

    if (a.major !== b.major) return a.major - b.major;
    if (a.minor !== b.minor) return a.minor - b.minor;
    if (a.patch !== b.patch) return a.patch - b.patch;

    // Prerelease comparison:
    // A normal version has greater precedence than a pre-release version
    if (!a.prerelease && b.prerelease) return 1;
    if (a.prerelease && !b.prerelease) return -1;
    if (!a.prerelease && !b.prerelease) return 0;

    // Both have prereleases: compare lexicographically
    return (a.prerelease || '').localeCompare(b.prerelease || '');
  }

  /**
   * Given a list of tags (e.g. from the latest commit on the default branch),
   * filters for valid SemVer, sorts them, and returns the highest in raw x.y.z format.
   */
  findHighestSemver(tags: string[]): string | null {
    if (!tags || tags.length === 0) return null;

    const validTags = tags
      .map(t => this.parseSemver(t))
      .filter((p): p is ParsedSemver => p !== null);

    if (validTags.length === 0) return null;

    // Sort descending by highest semver
    validTags.sort((a, b) => this.compareSemver(b.raw, a.raw));

    // Return the normalized x.y.z string of the highest
    return validTags[0].normalized;
  }

  /**
   * Strip leading 'v' or 'V' from version string
   */
  stripPrefix(version: string): string {
    return (version || '').trim().replace(/^v/i, '');
  }

  /**
   * Analyze diffs and project state to suggest Conventional Commit & SemVer tag bump
   */
  analyzeVersion(
    currentTag: string | undefined,
    projectName: string,
    diffs: FileDiff[],
    detectedOperations: string[] = []
  ): SemverAnalysis {
    const rawTag = this.stripPrefix(currentTag || '1.0.0');
    const [majorStr = '1', minorStr = '0', patchStr = '0'] = rawTag.split('.');

    const major = parseInt(majorStr, 10) || 1;
    const minor = parseInt(minorStr, 10) || 0;
    const patch = parseInt(patchStr, 10) || 0;

    // Check if any breaking change detected
    const breakingDiff = diffs.find(d => d.isBreakingChangeDetected);
    const hasBreakingChange = !!breakingDiff;
    const breakingReason = breakingDiff?.breakingReason;

    // Check if new endpoints or operations added
    const hasAdditions = diffs.some(d => d.changeType === 'added' || d.additionsCount > 10);

    let suggestedBump: SemverBumpType = 'patch';
    let commitType: 'feat!' | 'feat' | 'fix' | 'chore' | 'docs' | 'refactor' = 'fix';

    if (hasBreakingChange) {
      suggestedBump = 'major';
      commitType = 'feat!';
    } else if (hasAdditions || detectedOperations.length > 0) {
      suggestedBump = 'minor';
      commitType = 'feat';
    } else {
      suggestedBump = 'patch';
      commitType = 'fix';
    }

    // Default to raw x.y.z (preserveVPrefix = false)
    const calculatedNextVersion = this.incrementVersion(major, minor, patch, suggestedBump, false);
    const commitScope = this.sanitizeScope(projectName);
    const commitSubject = hasBreakingChange
      ? `update ${commitScope} specification with contract changes`
      : hasAdditions
      ? `sync updated ${commitScope} specification definitions`
      : `normalize line endings and specification metadata for ${commitScope}`;

    const commitDescription = this.generateCommitDescription(diffs, breakingReason);
    const commitMsg = this.buildCommitMessage(
      commitType,
      commitScope,
      commitSubject,
      commitDescription,
      hasBreakingChange ? (breakingReason || 'Specification contracts were modified or removed.') : undefined
    );

    return {
      currentVersion: rawTag,
      suggestedBump,
      calculatedNextVersion,
      commitType,
      commitScope,
      commitSubject,
      commitDescription,
      breakingChangeReason: breakingReason,
      isBreakingChange: hasBreakingChange,
      generatedCommitMessage: commitMsg
    };
  }

  incrementVersion(
    major: number,
    minor: number,
    patch: number,
    bump: SemverBumpType,
    preserveVPrefix = false
  ): string {
    let nextMajor = major;
    let nextMinor = minor;
    let nextPatch = patch;

    switch (bump) {
      case 'major':
        nextMajor = major + 1;
        nextMinor = 0;
        nextPatch = 0;
        break;
      case 'minor':
        nextMinor = minor + 1;
        nextPatch = 0;
        break;
      case 'patch':
        nextPatch = patch + 1;
        break;
      case 'none':
        break;
    }

    const v = `${nextMajor}.${nextMinor}.${nextPatch}`;
    return preserveVPrefix ? `v${v}` : v;
  }

  buildCommitMessage(
    type: string,
    scope: string,
    subject: string,
    description: string,
    breakingFooter?: string
  ): string {
    const scopePart = scope ? `(${scope})` : '';
    let msg = `${type}${scopePart}: ${subject.trim()}\n\n${description.trim()}`;

    if (breakingFooter) {
      msg += `\n\nBREAKING CHANGE: ${breakingFooter.trim()}`;
    }

    return msg.trim();
  }

  private sanitizeScope(projectName: string): string {
    return projectName
      .toLowerCase()
      .replace(/^svb-|^uwv-/, '')
      .replace(/-v\d+$/, '')
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 24);
  }

  private generateCommitDescription(diffs: FileDiff[], breakingReason?: string): string {
    const modifiedCount = diffs.filter(d => d.changeType === 'modified').length;
    const addedCount = diffs.filter(d => d.changeType === 'added').length;
    const deletedCount = diffs.filter(d => d.changeType === 'deleted').length;

    const bulletPoints: string[] = [];
    if (addedCount > 0) bulletPoints.push(`- Added ${addedCount} new specification asset(s)`);
    if (modifiedCount > 0) bulletPoints.push(`- Updated ${modifiedCount} existing contract/schema file(s)`);
    if (deletedCount > 0) bulletPoints.push(`- Removed ${deletedCount} obsolete file(s)`);
    bulletPoints.push('- Normalized all text line endings to Unix LF and removed UTF-8 BOM');

    if (breakingReason) {
      bulletPoints.push(`- Notice: ${breakingReason}`);
    }

    return bulletPoints.join('\n');
  }
}
