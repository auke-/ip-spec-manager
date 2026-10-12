import { ChangeDetectionStrategy, Component, computed, effect, inject, input, OnInit, output, signal } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import {
  CommitExecutionResult,
  FileDiff,
  GitlabCommitAction,
  GitlabProject,
  SemverAnalysis,
  UnpackedFile,
  ZipAnalysisResult
} from '../../models/gitlab.models';
import { DiffEngine } from '../../services/diff-engine';
import { GitlabApi } from '../../services/gitlab-api';
import { SemverService } from '../../services/semver';
import { ZipProcessor } from '../../services/zip-processor';

@Component({
  selector: 'app-spec-wizard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatIconModule, UpperCasePipe],
  template: `
    <div class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <!-- Wizard Header -->
        <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <mat-icon class="text-xl">auto_fix_high</mat-icon>
            </div>
            <div>
              <h2 class="text-base font-bold text-slate-900 font-display">
                {{ isNewProject() ? 'Create New API Specification Project' : 'Update Existing API Specification' }}
              </h2>
              <p class="text-xs text-slate-500">
                {{ isNewProject() ? 'Import WSDL / OpenAPI archive, normalize line endings, and publish' : 'Compare zipped release, inspect CRLF/LF diff, and trigger CI extraction' }}
              </p>
            </div>
          </div>
          <button
            type="button"
            (click)="wizardCancelled.emit()"
            class="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors">
            <mat-icon class="text-lg">close</mat-icon>
          </button>
        </div>

        <!-- 4-Step Stepper Progress Bar -->
        <div class="px-6 py-3 border-b border-slate-100 bg-white flex items-center justify-between text-xs font-medium shrink-0">
          
          <div class="flex items-center gap-2" [class.text-indigo-600]="step() === 1" [class.text-slate-400]="step() > 1">
            <span class="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold"
                  [class.bg-indigo-600]="step() === 1" [class.text-white]="step() === 1"
                  [class.bg-emerald-100]="step() > 1" [class.text-emerald-700]="step() > 1">
              {{ step() > 1 ? '✓' : '1' }}
            </span>
            <span class="hidden sm:inline">1. Target & Upload Zip</span>
          </div>

          <div class="h-0.5 flex-1 mx-3 bg-slate-100" [class.bg-indigo-600]="step() > 1"></div>

          <div class="flex items-center gap-2" [class.text-indigo-600]="step() === 2" [class.text-slate-400]="step() !== 2">
            <span class="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold"
                  [class.bg-indigo-600]="step() === 2" [class.text-white]="step() === 2"
                  [class.bg-emerald-100]="step() > 2" [class.text-emerald-700]="step() > 2"
                  [class.bg-slate-100]="step() < 2">
              {{ step() > 2 ? '✓' : '2' }}
            </span>
            <span class="hidden sm:inline">2. CRLF Normalization</span>
          </div>

          <div class="h-0.5 flex-1 mx-3 bg-slate-100" [class.bg-indigo-600]="step() > 2"></div>

          <div class="flex items-center gap-2" [class.text-indigo-600]="step() === 3" [class.text-slate-400]="step() !== 3">
            <span class="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold"
                  [class.bg-indigo-600]="step() === 3" [class.text-white]="step() === 3"
                  [class.bg-emerald-100]="step() > 3" [class.text-emerald-700]="step() > 3"
                  [class.bg-slate-100]="step() < 3">
              {{ step() > 3 ? '✓' : '3' }}
            </span>
            <span class="hidden sm:inline">3. Visual Diff & SemVer</span>
          </div>

          <div class="h-0.5 flex-1 mx-3 bg-slate-100" [class.bg-indigo-600]="step() > 3"></div>

          <div class="flex items-center gap-2" [class.text-indigo-600]="step() === 4" [class.text-slate-400]="step() < 4">
            <span class="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold"
                  [class.bg-indigo-600]="step() === 4" [class.text-white]="step() === 4"
                  [class.bg-slate-100]="step() < 4">
              4
            </span>
            <span class="hidden sm:inline">4. Commit & CI Trigger</span>
          </div>

        </div>

        <!-- Wizard Scrollable Body -->
        <div class="flex-1 overflow-y-auto p-6 space-y-6">

          <!-- ================= STEP 1: TARGET SELECTION & ZIP UPLOAD ================= -->
          @if (step() === 1) {
            <div class="space-y-6">

              <!-- Target Repository Selection -->
              <div class="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-4">
                <div class="flex items-center justify-between">
                  <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Target Specification Repository</h3>
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      (click)="isNewProject.set(false)"
                      class="px-2.5 py-1 text-xs rounded font-medium transition-colors"
                      [class.bg-indigo-600]="!isNewProject()"
                      [class.text-white]="!isNewProject()"
                      [class.bg-slate-200]="isNewProject()"
                      [class.text-slate-700]="isNewProject()">
                      Update Existing
                    </button>
                    <button
                      type="button"
                      (click)="isNewProject.set(true)"
                      class="px-2.5 py-1 text-xs rounded font-medium transition-colors"
                      [class.bg-indigo-600]="isNewProject()"
                      [class.text-white]="isNewProject()"
                      [class.bg-slate-200]="!isNewProject()"
                      [class.text-slate-700]="!isNewProject()">
                      Create New
                    </button>
                  </div>
                </div>

                @if (!isNewProject()) {
                  <div>
                    <div class="flex items-center justify-between mb-1">
                      <label for="wiz-select-project" class="block text-xs font-semibold text-slate-700">
                        Select Existing Specification Project
                      </label>
                      @if (initialProject()) {
                        <span class="text-[11px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/80 flex items-center gap-1">
                          <mat-icon class="text-xs text-indigo-600">check_circle</mat-icon>
                          <span>Pre-selected: {{ initialProject()?.name }}</span>
                        </span>
                      }
                    </div>
                    <select
                      id="wiz-select-project"
                      [formControl]="selectedProjectControl"
                      class="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono">
                      @for (p of availableProjects(); track p.id) {
                        <option [value]="p.id" [ngValue]="p.id">
                          {{ p.subgroupPath }} / {{ p.name }} (Current: {{ p.currentTag || 'v1.0.0' }} - {{ p.specType }})
                        </option>
                      }
                    </select>

                    @if (selectedProject(); as sp) {
                      <div class="mt-2.5 p-2.5 bg-indigo-50/60 rounded-lg border border-indigo-100 flex items-center justify-between text-xs">
                        <div class="flex items-center gap-2 flex-wrap">
                          <mat-icon class="text-sm text-indigo-600">domain_verification</mat-icon>
                          <span class="text-slate-500 text-[11px]">Target repo:</span>
                          <span class="font-bold text-slate-900 font-mono">{{ sp.name }}</span>
                          <span class="text-indigo-700 font-medium font-mono text-[11px] bg-white px-1.5 py-0.5 rounded border border-indigo-200">
                            Tag: {{ sp.currentTag || '0.1.0' }}
                          </span>
                          <span class="text-slate-600 font-medium text-[11px] capitalize">
                            Type: {{ sp.specType }}
                          </span>
                        </div>
                        <span class="text-[11px] text-slate-500 font-mono">{{ sp.subgroupPath }}</span>
                      </div>
                    }
                  </div>
                } @else {
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label for="wiz-subgroup" class="block text-xs font-semibold text-slate-700 mb-1">Subgroup</label>
                      <select
                        id="wiz-subgroup"
                        [formControl]="newSubgroupControl"
                        class="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono">
                        @for (sub of gitlab.subgroups(); track sub.id) {
                          <option [value]="sub.id">{{ sub.name }} ({{ sub.path }})</option>
                        }
                      </select>
                    </div>

                    <div>
                      <label for="wiz-proj-name" class="block text-xs font-semibold text-slate-700 mb-1">Specification Project Name</label>
                      <input
                        id="wiz-proj-name"
                        type="text"
                        [formControl]="newProjectNameControl"
                        placeholder="SVB-AOW-Inkomsten-v0402"
                        class="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono" />
                    </div>

                    <div class="sm:col-span-2">
                      <label for="wiz-proj-desc" class="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                      <input
                        id="wiz-proj-desc"
                        type="text"
                        [formControl]="newProjectDescControl"
                        placeholder="SuwiML AOW pension income verification service contract specification"
                        class="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                    </div>
                  </div>
                }
              </div>

              <!-- Zip Upload Drop Zone -->
              <div>
                <div class="block text-xs font-semibold text-slate-700 mb-1.5">
                  Upload Specification Archive (.zip)
                </div>
                
                <div
                  (dragover)="onDragOver($event)"
                  (dragleave)="onDragLeave($event)"
                  (drop)="onFileDrop($event)"
                  class="border-2 border-dashed rounded-xl p-8 text-center transition-colors flex flex-col items-center justify-center"
                  [class.border-indigo-500]="isDragging()"
                  [class.bg-indigo-50/50]="isDragging()"
                  [class.border-slate-300]="!isDragging()"
                  [class.bg-slate-50/30]="!isDragging()">
                  
                  <div class="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                    <mat-icon class="text-2xl">folder_zip</mat-icon>
                  </div>
                  <h4 class="text-sm font-semibold text-slate-800">
                    Drop your WSDL or OpenAPI .zip archive here
                  </h4>
                  <p class="text-xs text-slate-500 mt-1 max-w-md">
                    Supports archives containing WSDLs, XSDs, OpenAPI definitions, schemas, and README docs. Automatically filters out macOS metadata (<code class="font-mono text-[11px] bg-slate-100 text-slate-700 px-1 py-0.5 rounded">__MACOSX/</code>, <code class="font-mono text-[11px] bg-slate-100 text-slate-700 px-1 py-0.5 rounded">.DS_Store</code>).
                  </p>

                  <div class="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                    <label for="wiz-file-upload" class="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer transition-colors flex items-center gap-1.5">
                      <mat-icon class="text-sm">file_upload</mat-icon>
                      <span>Choose File...</span>
                      <input id="wiz-file-upload" type="file" accept=".zip" (change)="onFileInput($event)" class="sr-only" />
                    </label>

                    <span class="text-xs text-slate-400">or try a sample:</span>

                    <button
                      type="button"
                      (click)="loadSampleZip('suwiml')"
                      class="px-2.5 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200">
                      SuwiML Sample Zip
                    </button>

                    <button
                      type="button"
                      (click)="loadSampleZip('openapi')"
                      class="px-2.5 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200">
                      OpenAPI Sample Zip
                    </button>

                    <button
                      type="button"
                      (click)="loadSampleZip('macos-sample')"
                      title="Test automatic exclusion of __MACOSX and .DS_Store artifacts"
                      class="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-300 flex items-center gap-1">
                      <mat-icon class="text-xs text-slate-600">cleaning_services</mat-icon>
                      <span>Test macOS Zip</span>
                    </button>
                  </div>

                </div>
              </div>

              <!-- Unpacked Analysis Card -->
              @if (zipAnalysis()) {
                <div class="p-4 rounded-xl border border-indigo-200 bg-indigo-50/30 space-y-3">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <mat-icon class="text-indigo-600">verified</mat-icon>
                      <div>
                        <span class="text-xs font-bold text-slate-900 font-mono">{{ zipAnalysis()!.fileName }}</span>
                        <span class="text-[11px] text-slate-500 ml-2">({{ (zipAnalysis()!.fileSize / 1024).toFixed(1) }} KB)</span>
                      </div>
                    </div>
                    <span class="text-xs font-semibold text-indigo-700">
                      {{ zipAnalysis()!.parsedSummary }}
                    </span>
                  </div>

                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div class="p-2.5 bg-white rounded-lg border border-slate-200">
                      <div class="text-[10px] text-slate-400">Detected Spec Type</div>
                      <div class="font-bold text-slate-800 uppercase mt-0.5">{{ zipAnalysis()!.detectedSpecType }}</div>
                    </div>
                    <div class="p-2.5 bg-white rounded-lg border border-slate-200">
                      <div class="text-[10px] text-slate-400">Total Files</div>
                      <div class="font-bold text-slate-800 font-mono mt-0.5">{{ zipAnalysis()!.totalFiles }} files</div>
                    </div>
                    <div class="p-2.5 bg-white rounded-lg border border-slate-200">
                      <div class="text-[10px] text-slate-400">Windows CRLF Files</div>
                      <div class="font-bold text-amber-600 font-mono mt-0.5">{{ zipAnalysis()!.crlfCount }} file(s)</div>
                    </div>
                    <div class="p-2.5 bg-white rounded-lg border border-slate-200">
                      <div class="text-[10px] text-slate-400">Operations Extracted</div>
                      <div class="font-bold text-indigo-600 font-mono mt-0.5">{{ zipAnalysis()!.detectedOperations.length }}</div>
                    </div>
                  </div>

                  @if (zipAnalysis()!.serviceProperties) {
                    <div class="p-2.5 bg-white rounded-lg border border-indigo-100 flex items-center justify-between text-xs">
                      <div class="flex items-center gap-2">
                        <mat-icon class="text-indigo-600 text-sm">settings_suggest</mat-icon>
                        <span class="font-semibold text-slate-900 font-mono">{{ zipAnalysis()!.serviceProperties?.serviceName }}</span>
                      </div>
                      <div class="font-mono text-[11px] text-slate-600 flex items-center gap-2">
                        <span>FWI: <strong class="text-indigo-600">{{ zipAnalysis()!.serviceProperties?.fwiVersionAbbr }}</strong></span>
                        <span>·</span>
                        <span>Header: <strong>{{ zipAnalysis()!.serviceProperties?.headerVersionAbbr }}</strong></span>
                      </div>
                    </div>
                  }

                  @if (zipAnalysis()!.detectedOperations.length > 0) {
                    <div class="pt-2 text-xs">
                      <span class="text-slate-500 font-medium">Extracted Operations: </span>
                      <span class="font-mono text-slate-800">{{ zipAnalysis()!.detectedOperations.join(', ') }}</span>
                    </div>
                  }

                  @if (zipAnalysis()!.filteredMacArtifactsCount && zipAnalysis()!.filteredMacArtifactsCount! > 0) {
                    <div class="p-3 bg-amber-50 rounded-xl border border-amber-200/90 flex items-center justify-between text-xs text-amber-900 mt-2">
                      <div class="flex items-center gap-2">
                        <mat-icon class="text-amber-600 text-sm">cleaning_services</mat-icon>
                        <span>
                          Filtered <strong>{{ zipAnalysis()!.filteredMacArtifactsCount }}</strong> macOS metadata file(s) (<code class="font-mono text-[11px] bg-white px-1.5 py-0.5 rounded border border-amber-300 font-semibold">__MACOSX/</code>, <code class="font-mono text-[11px] bg-white px-1.5 py-0.5 rounded border border-amber-300 font-semibold">.DS_Store</code>)
                        </span>
                      </div>
                      <span class="text-[10px] font-bold text-amber-800 uppercase tracking-wide bg-amber-200/60 px-2 py-0.5 rounded">
                        Excluded from Commit
                      </span>
                    </div>
                  }
                </div>
              }

            </div>
          }

          <!-- ================= STEP 2: CRLF NORMALIZATION ================= -->
          @if (step() === 2) {
            <div class="space-y-4">
              
              <div class="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex items-start justify-between gap-4">
                <div>
                  <h3 class="text-xs font-bold text-slate-900">Line Ending & Character Encoding Normalization</h3>
                  <p class="text-xs text-slate-600 mt-1 leading-relaxed">
                    External WSDL and schema zip files authored on Windows workstations often carry <code>\\r\\n</code> (CRLF) endings and UTF-8 Byte Order Marks (BOM). All files below have been converted to standard Unix <code>\\n</code> (LF) to prevent git diff pollution and pipeline validation errors.
                  </p>
                </div>
                <div class="text-right shrink-0">
                  <span class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <mat-icon class="text-sm">done_all</mat-icon>
                    All Normalized to LF
                  </span>
                </div>
              </div>

              <!-- Normalization File Table -->
              <div class="rounded-xl border border-slate-200 overflow-hidden">
                <table class="w-full text-left border-collapse text-xs">
                  <thead class="bg-slate-100 text-slate-600 uppercase text-[10px] font-semibold tracking-wider">
                    <tr>
                      <th class="py-2.5 px-4">File Path</th>
                      <th class="py-2.5 px-3">Original Ending</th>
                      <th class="py-2.5 px-3">BOM Status</th>
                      <th class="py-2.5 px-3">Target Format</th>
                      <th class="py-2.5 px-3">Size</th>
                      <th class="py-2.5 px-4 text-right">Preview</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 font-mono">
                    @for (file of zipAnalysis()?.files || []; track file.path) {
                      <tr class="hover:bg-slate-50 transition-colors">
                        <td class="py-2 px-4 font-semibold text-slate-900">
                          {{ file.path }}
                        </td>
                        <td class="py-2 px-3">
                          @if (file.originalLineEnding === 'crlf') {
                            <span class="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[11px]">CRLF (\\r\\n)</span>
                          } @else if (file.originalLineEnding === 'mixed') {
                            <span class="text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded text-[11px]">Mixed</span>
                          } @else {
                            <span class="text-slate-500 text-[11px]">LF (\\n)</span>
                          }
                        </td>
                        <td class="py-2 px-3">
                          @if (file.hasBom) {
                            <span class="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded text-[11px]">BOM Stripped</span>
                          } @else {
                            <span class="text-slate-400 text-[11px]">None</span>
                          }
                        </td>
                        <td class="py-2 px-3 text-emerald-700 font-semibold">
                          Unix LF (\\n)
                        </td>
                        <td class="py-2 px-3 text-slate-500 tabular-nums">
                          {{ file.size }} B
                        </td>
                        <td class="py-2 px-4 text-right">
                          <button
                            type="button"
                            (click)="previewFile.set(file)"
                            class="text-indigo-600 hover:text-indigo-800 text-xs font-sans font-medium">
                            Inspect
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <!-- Quick File Content Inspector Drawer -->
              @if (previewFile()) {
                <div class="rounded-xl border border-slate-300 bg-white p-4 space-y-2">
                  <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span class="font-mono text-xs font-bold text-slate-800">{{ previewFile()!.path }}</span>
                    <button type="button" (click)="previewFile.set(null)" class="text-slate-400 hover:text-slate-600 text-xs">Close</button>
                  </div>
                  <pre class="bg-slate-900 text-slate-100 p-3 rounded-lg text-xs font-mono max-h-48 overflow-y-auto leading-relaxed m-0">{{ previewFile()!.content }}</pre>
                </div>
              }

            </div>
          }

          <!-- ================= STEP 3: VISUAL DIFF & SEMVER BUMP ================= -->
          @if (step() === 3) {
            <div class="space-y-6">

              <!-- SemVer Tag Bump & Conventional Commit Recommendation -->
              @if (semverAnalysis()) {
                <div class="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-4">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <mat-icon class="text-indigo-600">tag</mat-icon>
                      <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Semantic Versioning & Conventional Commit</h3>
                    </div>
                    
                    <div class="flex items-center gap-2 font-mono text-xs">
                      <span class="text-slate-500">Current: {{ semverAnalysis()!.currentVersion }}</span>
                      <mat-icon class="text-slate-400 text-sm">arrow_forward</mat-icon>
                      <span class="font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                        Next: {{ semverAnalysis()!.calculatedNextVersion }} ({{ semverAnalysis()!.suggestedBump | uppercase }})
                      </span>
                    </div>
                  </div>

                  @if (semverAnalysis()!.isBreakingChange) {
                    <div class="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                      <mat-icon class="text-amber-600 text-base shrink-0 mt-0.5">warning</mat-icon>
                      <div>
                        <span class="font-bold">Automated Compatibility Check: Potential Breaking Change Detected!</span>
                        <p class="mt-0.5">{{ semverAnalysis()!.breakingChangeReason }} This automatically triggers a <code>MAJOR</code> bump.</p>
                      </div>
                    </div>
                  }

                  <!-- Conventional Commit Message Editor -->
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label for="wiz-commit-type" class="block font-semibold text-slate-700 mb-1">Commit Type</label>
                      <select
                        id="wiz-commit-type"
                        [formControl]="commitTypeControl"
                        (change)="recalculateCommitMsg()"
                        class="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-mono">
                        <option value="feat!">feat! (Breaking / Major bump)</option>
                        <option value="feat">feat (New features / Minor bump)</option>
                        <option value="fix">fix (Bugfix / Patch bump)</option>
                        <option value="chore">chore (Maintenance / Patch bump)</option>
                        <option value="docs">docs (Documentation only / Patch bump)</option>
                      </select>
                    </div>

                    <div class="sm:col-span-2">
                      <label for="wiz-commit-subject" class="block font-semibold text-slate-700 mb-1">Subject</label>
                      <input
                        id="wiz-commit-subject"
                        type="text"
                        [formControl]="commitSubjectControl"
                        (input)="recalculateCommitMsg()"
                        class="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono text-xs" />
                    </div>
                  </div>

                  <div>
                    <div class="block text-[11px] font-semibold text-slate-700 mb-1">Full Generated Conventional Commit</div>
                    <pre class="p-3 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono leading-relaxed m-0">{{ semverAnalysis()!.generatedCommitMessage }}</pre>
                  </div>
                </div>
              }

              <!-- Visual Diff Viewer -->
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Specification File Changes (Diff against HEAD)
                  </h3>
                  <span class="text-xs text-slate-500 font-mono">
                    {{ fileDiffs().length }} file(s) modified or added
                  </span>
                </div>

                <!-- Diff Tabs -->
                <div class="flex items-center gap-1 overflow-x-auto border-b border-slate-200 pb-1 text-xs">
                  @for (diff of fileDiffs(); track diff.path) {
                    <button
                      type="button"
                      (click)="selectedDiffPath.set(diff.path)"
                      class="px-3 py-1.5 rounded-t-lg font-mono transition-colors whitespace-nowrap flex items-center gap-2 border-b-2"
                      [class.border-indigo-600]="selectedDiffPath() === diff.path"
                      [class.bg-slate-100]="selectedDiffPath() === diff.path"
                      [class.font-bold]="selectedDiffPath() === diff.path"
                      [class.border-transparent]="selectedDiffPath() !== diff.path">
                      <span>{{ diff.path }}</span>
                      @if (diff.changeType === 'added') {
                        <span class="text-emerald-600 font-sans text-[10px]">NEW</span>
                      } @else {
                        <span class="text-slate-500 font-mono text-[10px] tabular-nums">
                          +{{ diff.additionsCount }} -{{ diff.deletionsCount }}
                        </span>
                      }
                    </button>
                  }
                </div>

                <!-- Diff Content Code Panel -->
                @if (currentActiveDiff(); as diff) {
                  <div class="rounded-xl border border-slate-200 overflow-hidden bg-slate-950 font-mono text-xs">
                    <div class="px-4 py-2 bg-slate-900 border-b border-slate-800 text-slate-400 text-[11px] flex items-center justify-between">
                      <span>{{ diff.path }}</span>
                      <span>{{ diff.changeType | uppercase }} ({{ diff.additionsCount }} additions, {{ diff.deletionsCount }} deletions)</span>
                    </div>

                    <div class="max-h-80 overflow-y-auto divide-y divide-slate-900/40 p-2">
                      @for (line of diff.diffLines; track $index) {
                        <div
                          class="flex items-start px-2 py-0.5 leading-relaxed"
                          [class.bg-emerald-950/60]="line.type === 'add'"
                          [class.text-emerald-300]="line.type === 'add'"
                          [class.bg-rose-950/60]="line.type === 'remove'"
                          [class.text-rose-300]="line.type === 'remove'"
                          [class.text-slate-400]="line.type === 'context'">
                          
                          <span class="w-10 shrink-0 text-slate-600 text-right pr-3 select-none text-[10px]">
                            {{ line.newLineNumber || line.oldLineNumber || '' }}
                          </span>
                          
                          <span class="w-4 shrink-0 font-bold select-none text-slate-500">
                            {{ line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' ' }}
                          </span>

                          <span class="whitespace-pre overflow-x-auto">{{ line.content }}</span>
                        </div>
                      }
                    </div>
                  </div>
                }

              </div>

            </div>
          }

          <!-- ================= STEP 4: COMMIT & PIPELINE EXECUTION ================= -->
          @if (step() === 4) {
            <div class="space-y-6">

              @if (!commitResult()) {
                <!-- Confirmation before commit -->
                <div class="p-5 rounded-xl border border-slate-200 bg-white space-y-4">
                  <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                      <mat-icon class="text-xl">commit</mat-icon>
                    </div>
                    <div>
                      <h3 class="text-sm font-bold text-slate-900">Ready for Atomic GitLab Commit</h3>
                      <p class="text-xs text-slate-500">All normalized files will be committed together, triggering the extraction pipeline</p>
                    </div>
                  </div>

                  <div class="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-2">
                    <div class="flex justify-between">
                      <span class="text-slate-500">Target Project:</span>
                      <span class="font-mono font-semibold text-slate-900">{{ getEffectiveProjectName() }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-slate-500">Target Branch:</span>
                      <span class="font-mono text-slate-800">main</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-slate-500">Next Release Tag:</span>
                      <span class="font-mono font-bold text-indigo-600">{{ semverAnalysis()?.calculatedNextVersion }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-slate-500">Files Included:</span>
                      <span class="font-mono text-slate-800">{{ zipAnalysis()?.files?.length || 0 }} normalized files</span>
                    </div>
                  </div>

                  <div class="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800">
                    <div class="font-semibold flex items-center gap-1.5">
                      <mat-icon class="text-sm">precision_manufacturing</mat-icon>
                      Automated Pipeline Extraction Job
                    </div>
                    <p class="mt-1 text-[11px] leading-relaxed">
                      Committing will automatically trigger the GitLab CI pipeline to extract <code>metadata.properties</code>, <code>service-model.json</code>, gRPC <code>.proto</code> files, and test sample fixtures.
                    </p>
                  </div>

                  @if (commitError(); as errMsg) {
                    <div class="p-3 bg-rose-50 rounded-lg border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                      <mat-icon class="text-sm text-rose-600 shrink-0 mt-0.5">error_outline</mat-icon>
                      <div class="flex-1">
                        <div class="font-semibold">Commit Error</div>
                        <div>{{ errMsg }}</div>
                      </div>
                    </div>
                  }

                  <div class="pt-2 flex justify-end">
                    <button
                      type="button"
                      (click)="executeCommit()"
                      [disabled]="isCommitting()"
                      class="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center gap-2">
                      @if (isCommitting()) {
                        <mat-icon class="text-sm animate-spin">refresh</mat-icon>
                        <span>Committing to GitLab & Triggering CI...</span>
                      } @else {
                        <mat-icon class="text-base">cloud_upload</mat-icon>
                        <span>Execute Atomic Commit & Trigger Pipeline</span>
                      }
                    </button>
                  </div>
                </div>
              } @else {
                <!-- Success Result Screen with Pipeline Tracking -->
                <div class="p-6 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-6">
                  
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                      <mat-icon class="text-2xl">check_circle</mat-icon>
                    </div>
                    <div>
                      <h3 class="text-base font-bold text-slate-900">Atomic Commit Published Successfully!</h3>
                      <p class="text-xs text-slate-600">
                        Commit SHA <span class="font-mono font-semibold">{{ commitResult()!.commitSha }}</span> tagged with <span class="font-mono font-bold text-indigo-700">{{ semverAnalysis()?.calculatedNextVersion }}</span>
                      </p>
                    </div>
                  </div>

                  <!-- Live CI Pipeline Status Tracker -->
                  <div class="p-4 bg-white rounded-xl border border-slate-200 space-y-4">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <mat-icon class="text-indigo-600">sync</mat-icon>
                        <span class="text-xs font-bold text-slate-800">GitLab CI Pipeline #{{ commitResult()!.pipelineId }}</span>
                      </div>
                      <span class="px-2.5 py-0.5 text-xs font-semibold rounded bg-emerald-100 text-emerald-800">
                        IN PROGRESS / SUCCESS
                      </span>
                    </div>

                    <!-- Pipeline Stages -->
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div class="p-2.5 rounded bg-emerald-50 border border-emerald-200">
                        <div class="text-[10px] text-emerald-700">Stage 1</div>
                        <div class="font-semibold text-slate-900">validate-specs</div>
                        <div class="text-[10px] text-emerald-700 mt-1 flex items-center gap-1">
                          <mat-icon class="text-xs">check</mat-icon> PASSED
                        </div>
                      </div>
                      <div class="p-2.5 rounded bg-emerald-50 border border-emerald-200">
                        <div class="text-[10px] text-emerald-700">Stage 2</div>
                        <div class="font-semibold text-slate-900">extract-artifacts</div>
                        <div class="text-[10px] text-emerald-700 mt-1 flex items-center gap-1">
                          <mat-icon class="text-xs">check</mat-icon> GENERATED
                        </div>
                      </div>
                      <div class="p-2.5 rounded bg-emerald-50 border border-emerald-200">
                        <div class="text-[10px] text-emerald-700">Stage 3</div>
                        <div class="font-semibold text-slate-900">compat-checks</div>
                        <div class="text-[10px] text-emerald-700 mt-1 flex items-center gap-1">
                          <mat-icon class="text-xs">check</mat-icon> VERIFIED
                        </div>
                      </div>
                      <div class="p-2.5 rounded bg-emerald-50 border border-emerald-200">
                        <div class="text-[10px] text-emerald-700">Stage 4</div>
                        <div class="font-semibold text-slate-900">publish-grpc</div>
                        <div class="text-[10px] text-emerald-700 mt-1 flex items-center gap-1">
                          <mat-icon class="text-xs">check</mat-icon> COMPLETE
                        </div>
                      </div>
                    </div>

                    <!-- Extracted Artifacts Preview -->
                    <div class="pt-3 border-t border-slate-100 space-y-2 text-xs">
                      <span class="font-semibold text-slate-800">Downstream Artifacts Extracted by Pipeline:</span>
                      <ul class="space-y-1 text-slate-600 font-mono text-[11px]">
                        <li class="flex items-center gap-2">
                          <mat-icon class="text-emerald-600 text-sm">check</mat-icon>
                          <span>extracted/metadata.properties</span>
                        </li>
                        <li class="flex items-center gap-2">
                          <mat-icon class="text-emerald-600 text-sm">check</mat-icon>
                          <span>extracted/service-model.json</span>
                        </li>
                        <li class="flex items-center gap-2">
                          <mat-icon class="text-emerald-600 text-sm">check</mat-icon>
                          <span>extracted/service.proto</span>
                        </li>
                        <li class="flex items-center gap-2">
                          <mat-icon class="text-emerald-600 text-sm">check</mat-icon>
                          <span>extracted/sample-test-payloads.json</span>
                        </li>
                      </ul>
                    </div>

                  </div>

                </div>
              }

            </div>
          }

        </div>

        <!-- Wizard Footer Navigation Buttons -->
        <div class="px-6 py-4 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between shrink-0">
          <button
            type="button"
            (click)="onBack()"
            [disabled]="step() === 1 || !!commitResult()"
            class="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 disabled:opacity-40 transition-colors flex items-center gap-1">
            <mat-icon class="text-sm">arrow_back</mat-icon>
            <span>Back</span>
          </button>

          <div class="flex items-center gap-3">
            @if (commitResult()) {
              <button
                type="button"
                (click)="wizardFinished.emit()"
                class="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5">
                <mat-icon class="text-sm">done</mat-icon>
                <span>Back to Specifications</span>
              </button>
            } @else {
              <button
                type="button"
                (click)="onNext()"
                [disabled]="!canProceed()"
                class="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors flex items-center gap-1.5">
                <span>{{ step() === 3 ? 'Review Commit & Pipeline' : 'Next Step' }}</span>
                <mat-icon class="text-sm">arrow_forward</mat-icon>
              </button>
            }
          </div>
        </div>

      </div>
    </div>
  `
})
export class SpecWizard implements OnInit {
  readonly initialProject = input<GitlabProject | null>(null);
  readonly wizardCancelled = output<void>();
  readonly wizardFinished = output<void>();

  readonly gitlab = inject(GitlabApi);
  readonly zipProcessor = inject(ZipProcessor);
  readonly diffEngine = inject(DiffEngine);
  readonly semverService = inject(SemverService);

  readonly step = signal<number>(1);
  readonly isNewProject = signal<boolean>(false);
  readonly isDragging = signal<boolean>(false);
  readonly zipAnalysis = signal<ZipAnalysisResult | null>(null);
  readonly previewFile = signal<UnpackedFile | null>(null);

  readonly fileDiffs = signal<FileDiff[]>([]);
  readonly selectedDiffPath = signal<string>('');
  readonly semverAnalysis = signal<SemverAnalysis | null>(null);

  readonly isCommitting = signal<boolean>(false);
  readonly commitResult = signal<CommitExecutionResult | null>(null);
  readonly commitError = signal<string | null>(null);

  readonly selectedProjectControl = new FormControl<number>(0, { nonNullable: true });
  readonly newSubgroupControl = new FormControl<number>(101, { nonNullable: true });
  readonly newProjectNameControl = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  readonly newProjectDescControl = new FormControl('', { nonNullable: true });

  readonly commitTypeControl = new FormControl<'feat!' | 'feat' | 'fix' | 'chore' | 'docs'>('fix', { nonNullable: true });
  readonly commitSubjectControl = new FormControl('', { nonNullable: true });

  readonly availableProjects = computed(() => {
    const list = this.gitlab.projects();
    const init = this.initialProject();
    if (init && !list.some(p => p.id === init.id)) {
      return [init, ...list];
    }
    return list;
  });

  readonly selectedProject = computed(() => {
    const selectedId = this.selectedProjectControl.value;
    return this.availableProjects().find(p => p.id === selectedId) || this.initialProject() || null;
  });

  constructor() {
    effect(() => {
      const init = this.initialProject();
      if (init) {
        this.selectedProjectControl.setValue(init.id);
        this.isNewProject.set(false);
      }
    });
  }

  ngOnInit() {
    const init = this.initialProject();
    if (init) {
      this.selectedProjectControl.setValue(init.id);
      this.isNewProject.set(false);
    } else {
      const first = this.availableProjects()[0];
      if (first && !this.selectedProjectControl.value) {
        this.selectedProjectControl.setValue(first.id);
      }
    }
  }

  readonly currentActiveDiff = computed(() => {
    const path = this.selectedDiffPath();
    return this.fileDiffs().find(d => d.path === path) || this.fileDiffs()[0] || null;
  });

  canProceed(): boolean {
    if (this.step() === 1) {
      return !!this.zipAnalysis();
    }
    return true;
  }

  onDragOver(e: DragEvent) {
    e.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(e: DragEvent) {
    e.preventDefault();
    this.isDragging.set(false);
  }

  async onFileDrop(e: DragEvent) {
    e.preventDefault();
    this.isDragging.set(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      await this.processZip(files[0]);
    }
  }

  async onFileInput(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      await this.processZip(input.files[0]);
    }
  }

  async loadSampleZip(type: 'suwiml' | 'openapi' | 'macos-sample') {
    const file = await this.zipProcessor.generateSampleZip(type, true);
    await this.processZip(file);
  }

  private async processZip(file: File) {
    const analysis = await this.zipProcessor.processZipFile(file);
    this.zipAnalysis.set(analysis);
  }

  getEffectiveProjectName(): string {
    if (this.isNewProject()) {
      return this.newProjectNameControl.value || 'New-Specification-Project';
    }
    const currentProj = this.gitlab.projects().find(p => p.id === this.selectedProjectControl.value);
    return currentProj ? currentProj.name : 'Specification-Project';
  }

  async onNext() {
    const currentStep = this.step();

    if (currentStep === 1) {
      this.step.set(2);
    } else if (currentStep === 2) {
      // Step 2 -> Step 3: Compute Diffs and SemVer
      await this.prepareDiffsAndSemver();
      this.step.set(3);
    } else if (currentStep === 3) {
      this.step.set(4);
    }
  }

  onBack() {
    if (this.step() > 1) {
      this.step.update(s => s - 1);
    }
  }

  private async prepareDiffsAndSemver() {
    const zip = this.zipAnalysis();
    if (!zip) return;

    let targetProject: GitlabProject | undefined;
    if (!this.isNewProject()) {
      targetProject = this.gitlab.projects().find(p => p.id === this.selectedProjectControl.value);
    }

    const existingFiles = targetProject ? await this.gitlab.getProjectFiles(targetProject) : [];
    const diffs = this.diffEngine.computeDiffs(zip.files, existingFiles);
    this.fileDiffs.set(diffs);

    if (diffs.length > 0) {
      this.selectedDiffPath.set(diffs[0].path);
    }

    const semver = this.semverService.analyzeVersion(
      targetProject?.currentTag,
      targetProject?.name || this.newProjectNameControl.value,
      diffs,
      zip.detectedOperations
    );
    this.semverAnalysis.set(semver);

    this.commitTypeControl.setValue(semver.commitType as ('feat!' | 'feat' | 'fix' | 'chore' | 'docs'));
    this.commitSubjectControl.setValue(semver.commitSubject);
  }

  recalculateCommitMsg() {
    const analysis = this.semverAnalysis();
    if (!analysis) return;

    const type = this.commitTypeControl.value;
    const subject = this.commitSubjectControl.value;
    const isBreaking = type === 'feat!';

    let bump = analysis.suggestedBump;
    if (type === 'feat!') bump = 'major';
    else if (type === 'feat') bump = 'minor';
    else bump = 'patch';

    const rawTag = this.semverService.stripPrefix(analysis.currentVersion);
    const [maj = 1, min = 0, pat = 0] = rawTag.split('.').map(n => parseInt(n, 10));
    const nextVer = this.semverService.incrementVersion(maj, min, pat, bump, false);

    const fullMsg = this.semverService.buildCommitMessage(
      type,
      analysis.commitScope,
      subject,
      analysis.commitDescription,
      isBreaking ? (analysis.breakingChangeReason || 'Breaking specification change detected.') : undefined
    );

    this.semverAnalysis.set({
      ...analysis,
      suggestedBump: bump,
      calculatedNextVersion: nextVer,
      commitType: type,
      commitSubject: subject,
      isBreakingChange: isBreaking,
      generatedCommitMessage: fullMsg
    });
  }

  async executeCommit() {
    this.isCommitting.set(true);
    this.commitError.set(null);

    try {
      let project: GitlabProject;

      if (this.isNewProject()) {
        const rawType = this.zipAnalysis()?.detectedSpecType;
        const validSpecType: 'suwiml' | 'soap' | 'openapi' = (rawType === 'unknown' || !rawType) ? 'suwiml' : rawType;
        project = await this.gitlab.createNewProject({
          subgroupId: this.newSubgroupControl.value,
          name: this.newProjectNameControl.value,
          description: this.newProjectDescControl.value,
          specType: validSpecType
        });
      } else {
        const found = this.gitlab.projects().find(p => p.id === this.selectedProjectControl.value) || this.initialProject();
        if (!found) throw new Error('Target project not found');
        project = found;
      }

      // Build commit actions
      const files = this.zipAnalysis()?.files || [];
      const actions: GitlabCommitAction[] = files.map(f => ({
        action: 'create', // Gitlab API auto-updates existing or creates
        file_path: f.path,
        content: f.content,
        encoding: f.isBinary ? 'base64' : 'text'
      }));

      const res = await this.gitlab.executeAtomicCommitAndPipeline({
        project,
        branch: project.default_branch || 'main',
        commitMessage: this.semverAnalysis()?.generatedCommitMessage || 'feat: update specification',
        actions,
        newVersionTag: this.semverAnalysis()?.calculatedNextVersion || 'v1.0.0'
      });

      this.commitResult.set(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Commit failed';
      this.commitError.set(msg);
    } finally {
      this.isCommitting.set(false);
    }
  }
}
