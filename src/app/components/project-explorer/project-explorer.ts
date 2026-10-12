import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { GitlabProject, SpecType } from '../../models/gitlab.models';
import { GitlabApi } from '../../services/gitlab-api';

@Component({
  selector: 'app-project-explorer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatIconModule],
  template: `
    <div class="space-y-6">
      
      <!-- Metrics & Overview Strip -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white p-4 rounded-xl border border-slate-200">
          <div class="text-xs font-medium text-slate-500">Total Specification Repos</div>
          <div class="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {{ gitlab.projects().length }}
          </div>
          <div class="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>Across {{ gitlab.subgroups().length }} active subgroups</span>
          </div>
        </div>

        <div class="bg-white p-4 rounded-xl border border-slate-200">
          <div class="text-xs font-medium text-slate-500">SuwiML Endpoints (SOAP)</div>
          <div class="text-2xl font-bold font-mono tabular-nums text-indigo-600 mt-1">
            {{ suwimlCount() }}
          </div>
          <div class="text-[11px] text-slate-400 mt-1">WSDL 1.1 + SuwiML Headers</div>
        </div>

        <div class="bg-white p-4 rounded-xl border border-slate-200">
          <div class="text-xs font-medium text-slate-500">OpenAPI Specifications</div>
          <div class="text-2xl font-bold font-mono tabular-nums text-emerald-600 mt-1">
            {{ openApiCount() }}
          </div>
          <div class="text-[11px] text-slate-400 mt-1">REST / JSON OpenAPI 3.0</div>
        </div>

        <div class="bg-white p-4 rounded-xl border border-slate-200">
          <div class="text-xs font-medium text-slate-500">Non-SuwiML SOAP</div>
          <div class="text-2xl font-bold font-mono tabular-nums text-slate-700 mt-1">
            {{ soapCount() }}
          </div>
          <div class="text-[11px] text-slate-400 mt-1">Non-SuwiML SOAP Contracts</div>
        </div>
      </div>

      <!-- Live Metadata Discovery Banner -->
      @if (gitlab.isResolvingMetadata()) {
        <div class="flex items-center justify-between px-4 py-2.5 bg-indigo-50 border border-indigo-200/70 rounded-xl text-xs text-indigo-800 animate-pulse">
          <div class="flex items-center gap-2">
            <mat-icon class="text-base animate-spin text-indigo-600">sync</mat-icon>
            <span class="font-medium">Inspecting WSDL service.properties, OpenAPI specs, and SemVer tags across all {{ gitlab.metadataProgress().total }} projects...</span>
          </div>
          <div class="font-mono text-xs font-semibold px-2 py-0.5 bg-white text-indigo-700 rounded border border-indigo-200 shadow-xs">
            {{ gitlab.metadataProgress().resolved }} / {{ gitlab.metadataProgress().total }} processed
          </div>
        </div>
      }

      <!-- Main Filter Bar & Controls -->
      <div class="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
        <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          
          <!-- Search Box -->
          <div class="relative flex-1 max-w-md">
            <mat-icon class="absolute left-3 top-2.5 text-slate-400 text-lg">search</mat-icon>
            <input
              type="text"
              [formControl]="searchControl"
              placeholder="Filter by spec name, operation, or group..."
              class="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors" />
            @if (searchControl.value) {
              <button
                type="button"
                (click)="searchControl.setValue('')"
                class="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600">
                <mat-icon class="text-base">cancel</mat-icon>
              </button>
            }
          </div>

          <!-- Spec Type Filter Segmented Control -->
          <div class="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            <button
              type="button"
              (click)="typeFilter.set('all')"
              class="px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap"
              [class.bg-white]="typeFilter() === 'all'"
              [class.text-slate-900]="typeFilter() === 'all'"
              [class.shadow-xs]="typeFilter() === 'all'"
              [class.text-slate-600]="typeFilter() !== 'all'">
              All Types ({{ gitlab.projects().length }})
            </button>
            <button
              type="button"
              (click)="typeFilter.set('suwiml')"
              class="px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5"
              [class.bg-white]="typeFilter() === 'suwiml'"
              [class.text-indigo-600]="typeFilter() === 'suwiml'"
              [class.shadow-xs]="typeFilter() === 'suwiml'"
              [class.text-slate-600]="typeFilter() !== 'suwiml'">
              SuwiML SOAP ({{ suwimlCount() }})
            </button>
            <button
              type="button"
              (click)="typeFilter.set('soap')"
              class="px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap"
              [class.bg-white]="typeFilter() === 'soap'"
              [class.text-slate-900]="typeFilter() === 'soap'"
              [class.shadow-xs]="typeFilter() === 'soap'"
              [class.text-slate-600]="typeFilter() !== 'soap'">
              Non-SuwiML SOAP ({{ soapCount() }})
            </button>
            <button
              type="button"
              (click)="typeFilter.set('openapi')"
              class="px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5"
              [class.bg-white]="typeFilter() === 'openapi'"
              [class.text-emerald-700]="typeFilter() === 'openapi'"
              [class.shadow-xs]="typeFilter() === 'openapi'"
              [class.text-slate-600]="typeFilter() !== 'openapi'">
              OpenAPI ({{ openApiCount() }})
            </button>
            <button
              type="button"
              (click)="typeFilter.set('unknown')"
              class="px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1"
              [class.bg-white]="typeFilter() === 'unknown'"
              [class.text-amber-800]="typeFilter() === 'unknown'"
              [class.shadow-xs]="typeFilter() === 'unknown'"
              [class.text-slate-500]="typeFilter() !== 'unknown'">
              <mat-icon class="text-xs">help_outline</mat-icon>
              <span>Unknown ({{ unknownCount() }})</span>
            </button>
          </div>

          <!-- New Project Action -->
          <button
            type="button"
            (click)="createNewProject.emit()"
            class="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0">
            <mat-icon class="text-base">add</mat-icon>
            <span>Create New Spec Project</span>
          </button>

        </div>

        <!-- Subgroup Chips Filter -->
        <div class="flex items-center gap-2 pt-2 border-t border-slate-100 overflow-x-auto text-xs">
          <span class="text-slate-400 text-xs font-medium shrink-0 flex items-center gap-1">
            <mat-icon class="text-sm">folder_open</mat-icon>
            Subgroups:
          </span>
          <button
            type="button"
            (click)="subgroupFilter.set('all')"
            class="px-2.5 py-1 rounded text-xs transition-colors whitespace-nowrap"
            [class.bg-slate-900]="subgroupFilter() === 'all'"
            [class.text-white]="subgroupFilter() === 'all'"
            [class.bg-slate-100]="subgroupFilter() !== 'all'"
            [class.text-slate-600]="subgroupFilter() !== 'all'">
            All Subgroups ({{ gitlab.subgroups().length }})
          </button>
          @for (sub of gitlab.subgroups(); track sub.id) {
            <button
              type="button"
              (click)="subgroupFilter.set(sub.path)"
              class="px-2.5 py-1 rounded text-xs transition-colors whitespace-nowrap"
              [class.bg-indigo-600]="subgroupFilter() === sub.path"
              [class.text-white]="subgroupFilter() === sub.path"
              [class.bg-slate-100]="subgroupFilter() !== sub.path"
              [class.text-slate-600]="subgroupFilter() !== sub.path">
              {{ sub.name }}
            </button>
          }
        </div>
      </div>

      <!-- Specification Projects High-Density Table -->
      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        @if (gitlab.isLoading()) {
          <div class="p-12 text-center space-y-3">
            <mat-icon class="text-4xl text-indigo-500 animate-spin mx-auto">refresh</mat-icon>
            <div class="text-xs font-semibold text-slate-700">Querying GitLab repositories directly from browser...</div>
            <div class="text-[11px] text-slate-400 font-mono">{{ gitlab.config().hostUrl }} / {{ gitlab.config().rootGroupPath }}</div>
          </div>
        } @else if (filteredProjects().length === 0) {
          <div class="p-12 text-center">
            <mat-icon class="text-4xl text-slate-300 mx-auto mb-2">find_in_page</mat-icon>
            <h4 class="text-sm font-semibold text-slate-700">No specification projects found</h4>
            <p class="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              @if (!gitlab.config().isDemoMode) {
                No projects found under <code>{{ gitlab.config().rootGroupPath }}</code> on <code>{{ gitlab.config().hostUrl }}</code>. Verify your Personal Access Token permissions or create a new project.
              } @else {
                No repositories match the current filter or search query.
              }
            </p>
            @if (!gitlab.config().isDemoMode) {
              <div class="mt-4 flex items-center justify-center gap-2">
                <button
                  type="button"
                  (click)="gitlab.refreshData()"
                  class="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5">
                  <mat-icon class="text-sm">refresh</mat-icon>
                  <span>Reload from GitLab</span>
                </button>
              </div>
            }
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-50/75 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th class="py-3 px-4">Specification & Service</th>
                  <th class="py-3 px-3">Subgroup</th>
                  <th class="py-3 px-3">Type</th>
                  <th class="py-3 px-3">Operations</th>
                  <th class="py-3 px-3">SuwiML Protocol</th>
                  <th class="py-3 px-3">Version Tag</th>
                  <th class="py-3 px-3">CI Extraction</th>
                  <th class="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 text-xs">
                @for (proj of filteredProjects(); track proj.id) {
                  <tr class="hover:bg-slate-50/80 transition-colors group">
                    
                    <!-- Name, Service Name & Description -->
                    <td class="py-3 px-4">
                      <div class="flex items-start gap-2.5">
                        <div
                          class="w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                          [class.bg-indigo-50]="proj.specType === 'suwiml'"
                          [class.text-indigo-600]="proj.specType === 'suwiml'"
                          [class.bg-emerald-50]="proj.specType === 'openapi'"
                          [class.text-emerald-700]="proj.specType === 'openapi'"
                          [class.bg-slate-100]="proj.specType === 'soap'"
                          [class.text-slate-600]="proj.specType === 'soap'"
                          [class.bg-amber-50]="proj.specType === 'unknown'"
                          [class.text-amber-700]="proj.specType === 'unknown'">
                          <mat-icon class="text-base">
                            {{ proj.specType === 'openapi' ? 'api' : (proj.specType === 'unknown' ? 'help_outline' : 'code') }}
                          </mat-icon>
                        </div>
                        <div>
                          <div class="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center gap-2 flex-wrap">
                            <span>{{ proj.name }}</span>
                            @if (proj.serviceProperties?.serviceName && proj.serviceProperties?.serviceName !== proj.name) {
                              <span class="text-[10px] text-indigo-600 font-mono font-normal">({{ proj.serviceProperties?.serviceName }})</span>
                            }
                          </div>
                          @if (proj.serviceProperties?.filePath) {
                            <div class="text-[10px] text-slate-400 font-mono line-clamp-1 max-w-sm mt-0.5" [title]="proj.serviceProperties?.filePath">
                              {{ proj.serviceProperties?.filePath }}
                            </div>
                          }
                          <p class="text-[11px] text-slate-500 line-clamp-1 max-w-md mt-0.5">
                            {{ proj.description }}
                          </p>
                        </div>
                      </div>
                    </td>

                    <!-- Subgroup -->
                    <td class="py-3 px-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                      {{ proj.subgroupPath }}
                    </td>

                    <!-- Spec Type Badge-free text -->
                    <td class="py-3 px-3 whitespace-nowrap">
                      @if (proj.specType === 'suwiml') {
                        <span class="text-indigo-700 font-medium">SuwiML SOAP</span>
                      } @else if (proj.specType === 'soap') {
                        <span class="text-slate-700 font-medium">Non-SuwiML SOAP</span>
                      } @else if (proj.specType === 'openapi') {
                        <span class="text-emerald-700 font-medium">OpenAPI</span>
                      } @else {
                        <span class="text-amber-700 font-medium flex items-center gap-1">
                          <mat-icon class="text-xs">help_outline</mat-icon>
                          <span>Unknown</span>
                        </span>
                      }
                    </td>

                    <!-- Operations Count & Preview -->
                    <td class="py-3 px-3 whitespace-nowrap">
                      <div class="font-mono tabular-nums text-slate-800 font-semibold text-xs">
                        {{ (proj.serviceProperties ? proj.serviceProperties.operationCount : (proj.operations?.length || 0)) }} op(s)
                      </div>
                      @if (proj.operations && proj.operations.length > 0) {
                        <div class="text-[10px] text-slate-400 truncate max-w-[140px] font-mono" [title]="proj.operations.join(', ')">
                          {{ proj.operations[0] }}@if (proj.operations.length > 1) { +{{ proj.operations.length - 1 }} }
                        </div>
                      }
                    </td>

                    <!-- SuwiML Protocol (FWI & Header abbreviated) -->
                    <td class="py-3 px-3 whitespace-nowrap">
                      @if (proj.specType === 'suwiml' && proj.serviceProperties) {
                        <div class="flex items-center gap-1.5 font-mono text-[11px]">
                          <span class="text-slate-500 text-[10px]">FWI</span>
                          <span class="font-semibold text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded">{{ proj.serviceProperties.fwiVersionAbbr }}</span>
                          <span class="text-slate-300">·</span>
                          <span class="text-slate-500 text-[10px]">Hdr</span>
                          <span class="text-slate-700 font-medium">{{ proj.serviceProperties.headerVersionAbbr }}</span>
                        </div>
                      } @else if (proj.specType === 'soap') {
                        <div class="text-[11px] text-slate-600 font-mono flex items-center gap-1.5">
                          <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                          <span>Non-SuwiML WSDL</span>
                        </div>
                      } @else if (proj.specType === 'openapi') {
                        <div class="text-[11px] text-emerald-700 font-mono flex items-center gap-1.5">
                          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>OpenAPI YAML</span>
                        </div>
                      } @else {
                        <span class="text-slate-300 text-[11px] font-mono">—</span>
                      }
                    </td>

                    <!-- Version Tag (Unboxed text with mono) -->
                    <td class="py-3 px-3 whitespace-nowrap">
                      <span class="font-mono tabular-nums text-slate-900 font-medium">
                        {{ proj.currentTag || '0.1.0' }}
                      </span>
                    </td>

                    <!-- Pipeline Status -->
                    <td class="py-3 px-3 whitespace-nowrap">
                      @if (proj.latestPipeline) {
                        <div class="flex items-center gap-1.5">
                          @if (proj.latestPipeline.status === 'success') {
                            <mat-icon class="text-emerald-600 text-sm">check_circle</mat-icon>
                            <span class="text-emerald-700 font-medium text-[11px]">Passed</span>
                          } @else if (proj.latestPipeline.status === 'running') {
                            <mat-icon class="text-amber-500 text-sm animate-spin">sync</mat-icon>
                            <span class="text-amber-700 font-medium text-[11px]">Extracting</span>
                          } @else if (proj.latestPipeline.status === 'failed') {
                            <mat-icon class="text-rose-600 text-sm">cancel</mat-icon>
                            <span class="text-rose-700 font-medium text-[11px]">Failed</span>
                          } @else {
                            <mat-icon class="text-slate-400 text-sm">hourglass_empty</mat-icon>
                            <span class="text-slate-600 font-medium text-[11px]">Pending</span>
                          }
                        </div>
                      } @else {
                        <span class="text-slate-400 text-[11px]">None</span>
                      }
                    </td>

                    <!-- Actions -->
                    <td class="py-3 px-4 text-right whitespace-nowrap">
                      <div class="flex items-center justify-end gap-1.5">
                        
                        <button
                          type="button"
                          (click)="inspectProject.emit(proj)"
                          title="Inspect specification contracts & extracted properties"
                          class="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded text-xs transition-colors flex items-center gap-1">
                          <mat-icon class="text-sm">visibility</mat-icon>
                          <span>Inspect</span>
                        </button>

                        <button
                          type="button"
                          (click)="updateProjectViaZip.emit(proj)"
                          title="Upload updated zip file, inspect CRLF/LF diff, and commit"
                          class="px-2.5 py-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded text-xs font-medium transition-colors flex items-center gap-1">
                          <mat-icon class="text-sm">upload_file</mat-icon>
                          <span>Update Spec</span>
                        </button>

                      </div>
                    </td>

                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

    </div>
  `
})
export class ProjectExplorer {
  readonly gitlab = inject(GitlabApi);

  readonly inspectProject = output<GitlabProject>();
  readonly updateProjectViaZip = output<GitlabProject>();
  readonly createNewProject = output<void>();

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly typeFilter = signal<'all' | SpecType>('all');
  readonly subgroupFilter = signal<string>('all');

  readonly suwimlCount = computed(() =>
    this.gitlab.projects().filter(p => p.specType === 'suwiml').length
  );

  readonly openApiCount = computed(() =>
    this.gitlab.projects().filter(p => p.specType === 'openapi').length
  );

  readonly soapCount = computed(() =>
    this.gitlab.projects().filter(p => p.specType === 'soap').length
  );

  readonly unknownCount = computed(() =>
    this.gitlab.projects().filter(p => p.specType === 'unknown').length
  );

  readonly filteredProjects = computed(() => {
    const list = this.gitlab.projects();
    const query = this.searchControl.value.trim().toLowerCase();
    const type = this.typeFilter();
    const sub = this.subgroupFilter();

    return list.filter(p => {
      // Type filter
      if (type !== 'all' && p.specType !== type) return false;

      // Subgroup filter
      if (sub !== 'all' && p.subgroupPath !== sub) return false;

      // Search query
      if (query) {
        const matchName = p.name.toLowerCase().includes(query);
        const matchServiceName = p.serviceProperties?.serviceName?.toLowerCase().includes(query);
        const matchDesc = p.description.toLowerCase().includes(query);
        const matchSub = p.subgroupPath.toLowerCase().includes(query);
        const matchOps = p.operations?.some(op => op.toLowerCase().includes(query));
        const matchFilePath = p.serviceProperties?.filePath?.toLowerCase().includes(query);
        const matchFwi = p.serviceProperties?.fwiVersionAbbr?.toLowerCase().includes(query);
        const matchHdr = p.serviceProperties?.headerVersionAbbr?.toLowerCase().includes(query);
        return matchName || !!matchServiceName || matchDesc || matchSub || !!matchOps || !!matchFilePath || !!matchFwi || !!matchHdr;
      }

      return true;
    });
  });
}
