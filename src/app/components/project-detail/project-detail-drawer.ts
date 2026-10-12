import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { DatePipe, UpperCasePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { GitlabProject } from '../../models/gitlab.models';
import { GitlabApi } from '../../services/gitlab-api';

@Component({
  selector: 'app-project-detail-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, UpperCasePipe, DatePipe],
  template: `
    <div class="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end">
      <div class="w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
        
        <!-- Header -->
        <div class="p-6 border-b border-slate-200 flex items-start justify-between bg-slate-50/60">
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-xs font-mono text-slate-500">{{ currentProject().subgroupPath }}</span>
              <span class="text-slate-300">/</span>
              <span class="text-xs font-mono font-bold text-indigo-600">{{ currentProject().currentTag || '0.1.0' }}</span>
              @if (currentProject().specType === 'suwiml') {
                <span class="px-2 py-0.5 text-[10px] font-mono font-semibold bg-indigo-50 text-indigo-700 rounded border border-indigo-200/60">
                  SuwiML FWI {{ currentProject().serviceProperties?.fwiVersionAbbr }}
                </span>
              } @else if (currentProject().specType === 'soap') {
                <span class="px-2 py-0.5 text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 rounded border border-slate-200">
                  Non-SuwiML SOAP
                </span>
              } @else if (currentProject().specType === 'openapi') {
                <span class="px-2 py-0.5 text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-700 rounded border border-emerald-200/60">
                  OpenAPI 3.x
                </span>
              } @else {
                <span class="px-2 py-0.5 text-[10px] font-mono font-semibold bg-amber-50 text-amber-700 rounded border border-amber-200/60">
                  Unknown
                </span>
              }

              <!-- Cache Verification Chip -->
              @if (isCheckingCommit()) {
                <span class="px-2 py-0.5 text-[10px] font-mono font-medium bg-indigo-50 text-indigo-700 rounded border border-indigo-200/60 flex items-center gap-1">
                  <mat-icon class="text-xs animate-spin">sync</mat-icon>
                  <span>Verifying commit SHA...</span>
                </span>
              } @else if (currentProject().isCached) {
                <span class="px-2 py-0.5 text-[10px] font-mono font-medium bg-emerald-50 text-emerald-700 rounded border border-emerald-200/60 flex items-center gap-1"
                  [title]="'Commit: ' + (currentProject().cachedCommitSha || 'unknown') + (currentProject().lastVerifiedAt ? ' · Verified ' + (currentProject().lastVerifiedAt | date:'medium') : '')">
                  <mat-icon class="text-xs text-emerald-600">offline_pin</mat-icon>
                  <span>Cached @ {{ currentProject().cachedCommitSha ? currentProject().cachedCommitSha!.substring(0, 7) : 'latest' }}</span>
                </span>
              }
            </div>
            <div class="flex items-center gap-3 mt-1">
              <h2 class="text-lg font-bold text-slate-900 font-display">
                {{ currentProject().serviceProperties?.serviceName || currentProject().name }}
              </h2>
              @if (!gitlab.config().isDemoMode) {
                <button
                  type="button"
                  [disabled]="isCheckingCommit()"
                  (click)="forceRefresh()"
                  title="Force re-fetch all files and properties from GitLab"
                  class="px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:text-indigo-600 hover:bg-slate-200/60 rounded border border-slate-300 transition-colors flex items-center gap-1 disabled:opacity-50">
                  <mat-icon class="text-xs" [class.animate-spin]="isCheckingCommit()">sync</mat-icon>
                  <span>Force Refresh</span>
                </button>
              }
              <button
                type="button"
                (click)="updateProjectViaZip.emit(currentProject())"
                title="Upload updated zip file for this specification"
                class="px-2 py-0.5 text-[10px] font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 transition-colors flex items-center gap-1 cursor-pointer">
                <mat-icon class="text-xs">upload_file</mat-icon>
                <span>Update Spec</span>
              </button>
            </div>
            @if (currentProject().serviceProperties?.serviceName && currentProject().serviceProperties?.serviceName !== currentProject().name) {
              <div class="text-xs text-slate-500 font-mono mt-0.5">Repo: {{ currentProject().name }}</div>
            }
            <p class="text-xs text-slate-600 mt-1 leading-relaxed">{{ currentProject().description }}</p>
          </div>
          <button
            type="button"
            (click)="closeRequested.emit()"
            class="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors">
            <mat-icon class="text-xl">close</mat-icon>
          </button>
        </div>

        <!-- Navigation Tabs inside Drawer -->
        <div class="flex items-center gap-1 px-6 border-b border-slate-200 bg-white text-xs overflow-x-auto">
          @if (project().serviceProperties) {
            <button
              type="button"
              (click)="activeTab.set('service-properties')"
              class="py-3 px-3 border-b-2 font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap"
              [class.border-indigo-600]="activeTab() === 'service-properties'"
              [class.text-indigo-600]="activeTab() === 'service-properties'"
              [class.border-transparent]="activeTab() !== 'service-properties'"
              [class.text-slate-600]="activeTab() !== 'service-properties'">
              <mat-icon class="text-base">tune</mat-icon>
              Service Properties
            </button>
          }

          <button
            type="button"
            (click)="activeTab.set('contract')"
            class="py-3 px-3 border-b-2 font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap"
            [class.border-indigo-600]="activeTab() === 'contract'"
            [class.text-indigo-600]="activeTab() === 'contract'"
            [class.border-transparent]="activeTab() !== 'contract'"
            [class.text-slate-600]="activeTab() !== 'contract'">
            <mat-icon class="text-base">code</mat-icon>
            Specification Files
          </button>

          <button
            type="button"
            (click)="activeTab.set('extracted')"
            class="py-3 px-3 border-b-2 font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap"
            [class.border-indigo-600]="activeTab() === 'extracted'"
            [class.text-indigo-600]="activeTab() === 'extracted'"
            [class.border-transparent]="activeTab() !== 'extracted'"
            [class.text-slate-600]="activeTab() !== 'extracted'">
            <mat-icon class="text-base">schema</mat-icon>
            Generated Models
          </button>

          <button
            type="button"
            (click)="activeTab.set('pipeline')"
            class="py-3 px-3 border-b-2 font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap"
            [class.border-indigo-600]="activeTab() === 'pipeline'"
            [class.text-indigo-600]="activeTab() === 'pipeline'"
            [class.border-transparent]="activeTab() !== 'pipeline'"
            [class.text-slate-600]="activeTab() !== 'pipeline'">
            <mat-icon class="text-base">alt_route</mat-icon>
            CI/CD Pipeline Jobs
          </button>
        </div>

        <!-- Drawer Content Body -->
        <div class="flex-1 overflow-y-auto p-6 space-y-6">
          
          <!-- TAB 1: SuwiML Service Properties -->
          @if (activeTab() === 'service-properties' && project().serviceProperties) {
            <div class="space-y-6">
              
              <!-- File Banner -->
              <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <mat-icon class="text-indigo-600 text-sm">settings_suggest</mat-icon>
                  <div>
                    <span class="text-xs font-semibold text-slate-800">Source Configuration: </span>
                    <code class="text-xs font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                      {{ project().serviceProperties?.filePath || 'generated-reference/nl/bkwi/specification/wsdl/' + project().name + '/service.properties' }}
                    </code>
                  </div>
                </div>
                <span class="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                  <mat-icon class="text-xs">verified</mat-icon> Parsed from repo HEAD
                </span>
              </div>

              <!-- Top Metrics Grid -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div class="p-3 bg-white border border-slate-200 rounded-xl">
                  <div class="text-[10px] uppercase font-semibold text-slate-400">Service Name</div>
                  <div class="font-bold font-mono text-slate-900 mt-1 truncate" [title]="project().serviceProperties?.serviceName || ''">
                    {{ project().serviceProperties?.serviceName || '—' }}
                  </div>
                </div>

                <div class="p-3 bg-white border border-slate-200 rounded-xl">
                  <div class="text-[10px] uppercase font-semibold text-slate-400">Operations</div>
                  <div class="font-bold font-mono text-indigo-600 mt-1">
                    {{ project().serviceProperties?.operationCount || 0 }} operation(s)
                  </div>
                </div>

                <div class="p-3 bg-white border border-slate-200 rounded-xl">
                  <div class="text-[10px] uppercase font-semibold text-slate-400">FWI Version</div>
                  <div class="font-bold font-mono text-slate-900 mt-1 flex items-center gap-1">
                    <span class="px-1.5 py-0.2 bg-indigo-50 text-indigo-700 rounded">{{ project().serviceProperties?.fwiVersionAbbr }}</span>
                  </div>
                </div>

                <div class="p-3 bg-white border border-slate-200 rounded-xl">
                  <div class="text-[10px] uppercase font-semibold text-slate-400">Header Version</div>
                  <div class="font-bold font-mono text-slate-900 mt-1">
                    {{ project().serviceProperties?.headerVersionAbbr }}
                  </div>
                </div>
              </div>

              <!-- SuwiML Configuration Flags & Namespaces -->
              <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div class="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h4 class="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <mat-icon class="text-sm text-indigo-600">tune</mat-icon>
                    SuwiML Protocol Parameters & Flags
                  </h4>
                  <span class="text-[11px] text-slate-500 font-mono">suwiml.*</span>
                </div>
                <div class="p-4 space-y-3 text-xs">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div class="text-[10px] text-slate-400 uppercase font-semibold">FWI Namespace (suwiml.fwi)</div>
                      <code class="block mt-0.5 text-xs text-slate-800 font-mono break-all bg-slate-50 p-1.5 rounded border border-slate-100">
                        {{ project().serviceProperties?.fwiRaw || '—' }}
                      </code>
                    </div>

                    <div>
                      <div class="text-[10px] text-slate-400 uppercase font-semibold">Header (suwiml.header)</div>
                      <code class="block mt-0.5 text-xs text-slate-800 font-mono break-all bg-slate-50 p-1.5 rounded border border-slate-100">
                        {{ project().serviceProperties?.headerRaw || '— (No explicit header)' }}
                      </code>
                    </div>
                  </div>

                  <div class="pt-2 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div class="flex items-center gap-2 p-2 bg-slate-50 rounded border border-slate-100">
                      <mat-icon class="text-xs" [class.text-emerald-600]="project().serviceProperties?.nietsgevonden" [class.text-slate-300]="!project().serviceProperties?.nietsgevonden">
                        {{ project().serviceProperties?.nietsgevonden ? 'check_circle' : 'cancel' }}
                      </mat-icon>
                      <div>
                        <div class="text-[10px] text-slate-400">nietsgevonden</div>
                        <div class="font-semibold text-slate-800">{{ project().serviceProperties?.nietsgevonden ? 'true' : 'false' }}</div>
                      </div>
                    </div>

                    <div class="flex items-center gap-2 p-2 bg-slate-50 rounded border border-slate-100">
                      <mat-icon class="text-xs" [class.text-emerald-600]="project().serviceProperties?.addressing" [class.text-slate-300]="!project().serviceProperties?.addressing">
                        {{ project().serviceProperties?.addressing ? 'check_circle' : 'cancel' }}
                      </mat-icon>
                      <div>
                        <div class="text-[10px] text-slate-400">addressing</div>
                        <div class="font-semibold text-slate-800">{{ project().serviceProperties?.addressing ? 'true' : 'false' }}</div>
                      </div>
                    </div>

                    <div class="flex items-center gap-2 p-2 bg-slate-50 rounded border border-slate-100">
                      <mat-icon class="text-xs" [class.text-emerald-600]="project().serviceProperties?.security" [class.text-slate-300]="!project().serviceProperties?.security">
                        {{ project().serviceProperties?.security ? 'check_circle' : 'cancel' }}
                      </mat-icon>
                      <div>
                        <div class="text-[10px] text-slate-400">security</div>
                        <div class="font-semibold text-slate-800">{{ project().serviceProperties?.security ? 'true' : 'false' }}</div>
                      </div>
                    </div>

                    <div class="flex items-center gap-2 p-2 bg-slate-50 rounded border border-slate-100">
                      <mat-icon class="text-xs" [class.text-emerald-600]="project().serviceProperties?.soapaction" [class.text-slate-300]="!project().serviceProperties?.soapaction">
                        {{ project().serviceProperties?.soapaction ? 'check_circle' : 'cancel' }}
                      </mat-icon>
                      <div>
                        <div class="text-[10px] text-slate-400">soapaction</div>
                        <div class="font-semibold text-slate-800">{{ project().serviceProperties?.soapaction ? 'true' : 'false' }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- WSDL and XSD Schema Paths -->
              <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div class="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h4 class="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <mat-icon class="text-sm text-indigo-600">folder_zip</mat-icon>
                    WSDL and XSD Schema Locations
                  </h4>
                  <span class="text-[11px] text-slate-500 font-mono">schema.*</span>
                </div>
                <div class="p-4 space-y-2 font-mono text-xs">
                  @if (project().serviceProperties?.schemaWsdl) {
                    <div class="flex items-start justify-between gap-2 p-2 bg-slate-50 rounded">
                      <span class="text-slate-500 text-[11px] shrink-0">schema.wsdl</span>
                      <span class="text-slate-900 break-all text-right font-semibold">{{ project().serviceProperties?.schemaWsdl }}</span>
                    </div>
                  }
                  @if (project().serviceProperties?.schemaRequest) {
                    <div class="flex items-start justify-between gap-2 p-2 bg-slate-50 rounded">
                      <span class="text-slate-500 text-[11px] shrink-0">schema.request</span>
                      <span class="text-slate-900 break-all text-right">{{ project().serviceProperties?.schemaRequest }}</span>
                    </div>
                  }
                  @if (project().serviceProperties?.schemaResponse) {
                    <div class="flex items-start justify-between gap-2 p-2 bg-slate-50 rounded">
                      <span class="text-slate-500 text-[11px] shrink-0">schema.response</span>
                      <span class="text-slate-900 break-all text-right">{{ project().serviceProperties?.schemaResponse }}</span>
                    </div>
                  }
                  @if (project().serviceProperties?.schemaTypeless) {
                    <div class="flex items-start justify-between gap-2 p-2 bg-slate-50 rounded">
                      <span class="text-slate-500 text-[11px] shrink-0">schema.typeless</span>
                      <span class="text-slate-900 break-all text-right">{{ project().serviceProperties?.schemaTypeless }}</span>
                    </div>
                  }
                  @if (project().serviceProperties?.schemaSample) {
                    <div class="flex items-start justify-between gap-2 p-2 bg-slate-50 rounded">
                      <span class="text-slate-500 text-[11px] shrink-0">schema.sample</span>
                      <span class="text-slate-900 break-all text-right">{{ project().serviceProperties?.schemaSample }}</span>
                    </div>
                  }
                </div>
              </div>

              <!-- Broker Filter Configuration -->
              @if (project().serviceProperties?.filterKeyExpression) {
                <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div class="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <h4 class="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <mat-icon class="text-sm text-indigo-600">filter_alt</mat-icon>
                      Broker Filter (Blacklist & Whitelist XPath Expression)
                    </h4>
                    <span class="text-[11px] text-slate-500 font-mono">filter.key.expression</span>
                  </div>
                  <div class="p-4 bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto">
                    <code>{{ project().serviceProperties?.filterKeyExpression }}</code>
                  </div>
                </div>
              }

              <!-- Operations & Test XML Payloads -->
              <div class="space-y-4">
                <h4 class="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <mat-icon class="text-sm text-indigo-600">api</mat-icon>
                  Configured Operations & Test XML Payloads
                </h4>

                @for (op of (project().serviceProperties?.operations || []); track op) {
                  @let detail = project().serviceProperties?.operationDetails?.[op];
                  <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div class="px-4 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <mat-icon class="text-indigo-600 text-sm">bolt</mat-icon>
                        <span class="text-xs font-bold text-slate-900 font-mono">{{ op }}</span>
                      </div>
                      <span class="text-[10px] text-indigo-600 font-mono font-medium">SOAP Operation</span>
                    </div>
                    
                    <div class="p-4 space-y-4 text-xs">
                      <!-- Namespaces & Actions -->
                      @if (detail) {
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] font-mono">
                          @if (detail.requestNamespace) {
                            <div class="p-2 bg-slate-50 rounded border border-slate-100">
                              <div class="text-[10px] text-slate-400 font-sans uppercase">Request Namespace</div>
                              <div class="text-slate-800 break-all mt-0.5">{{ detail.requestNamespace }}</div>
                            </div>
                          }
                          @if (detail.requestAction) {
                            <div class="p-2 bg-slate-50 rounded border border-slate-100">
                              <div class="text-[10px] text-slate-400 font-sans uppercase">SOAP Request Action</div>
                              <div class="text-slate-800 break-all mt-0.5">{{ detail.requestAction }}</div>
                            </div>
                          }
                          @if (detail.responseAction) {
                            <div class="p-2 bg-slate-50 rounded border border-slate-100">
                              <div class="text-[10px] text-slate-400 font-sans uppercase">SOAP Response Action</div>
                              <div class="text-slate-800 break-all mt-0.5">{{ detail.responseAction }}</div>
                            </div>
                          }
                          @if (detail.faultNamespace) {
                            <div class="p-2 bg-slate-50 rounded border border-slate-100">
                              <div class="text-[10px] text-slate-400 font-sans uppercase">Fault Namespace</div>
                              <div class="text-slate-800 break-all mt-0.5">{{ detail.faultNamespace }}</div>
                            </div>
                          }
                        </div>
                      }

                      <!-- Valid Test Payload -->
                      @if (detail?.requestValid) {
                        <div>
                          <div class="text-[11px] font-semibold text-emerald-800 flex items-center gap-1.5 mb-1.5">
                            <mat-icon class="text-xs text-emerald-600">check_circle</mat-icon>
                            <span>Generated Test Data (request.valid):</span>
                          </div>
                          <div class="p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-lg overflow-x-auto">
                            <pre class="m-0 whitespace-pre">{{ detail?.requestValid }}</pre>
                          </div>
                        </div>
                      }

                      <!-- Not Found Test Payload -->
                      @if (detail?.requestNotFound) {
                        <div>
                          <div class="text-[11px] font-semibold text-amber-800 flex items-center gap-1.5 mb-1.5">
                            <mat-icon class="text-xs text-amber-600">help_outline</mat-icon>
                            <span>Generated Test Data (request.notfound):</span>
                          </div>
                          <div class="p-3 bg-slate-900 text-amber-300 font-mono text-xs rounded-lg overflow-x-auto">
                            <pre class="m-0 whitespace-pre">{{ detail?.requestNotFound }}</pre>
                          </div>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>

              <!-- Raw Properties File Display -->
              <div class="rounded-xl border border-slate-200 overflow-hidden">
                <div class="px-4 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <mat-icon class="text-slate-600 text-sm">code</mat-icon>
                    <span class="text-xs font-semibold text-slate-800 font-mono">service.properties (Raw Content)</span>
                  </div>
                  <span class="text-[10px] text-slate-400 font-mono">{{ rawPropertiesCount() }} entries</span>
                </div>
                <div class="p-4 bg-slate-950 text-slate-200 font-mono text-xs max-h-72 overflow-y-auto leading-relaxed">
                  <pre class="m-0 whitespace-pre">{{ rawPropertiesFormatted() }}</pre>
                </div>
              </div>

            </div>
          }

          <!-- TAB 2: Raw Specification Files -->
          @if (activeTab() === 'contract') {
            <div class="space-y-4">
              <div class="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-xs text-indigo-900 flex items-center gap-2">
                <mat-icon class="text-indigo-600 text-sm">info</mat-icon>
                <span>These files are synchronized from the GitLab repository default branch (<code>{{ project().default_branch }}</code>).</span>
              </div>

              @if (project().files && project().files!.length > 0) {
                @for (file of project().files!; track file.path) {
                  <div class="rounded-xl border border-slate-200 overflow-hidden">
                    <div class="px-4 py-2 bg-slate-100 text-xs font-mono font-medium text-slate-800 flex items-center justify-between">
                      <span>{{ file.path }}</span>
                      <span class="text-[11px] text-slate-400 font-sans">Unix LF</span>
                    </div>
                    <div class="p-4 bg-slate-950 text-slate-200 font-mono text-xs max-h-64 overflow-y-auto leading-relaxed">
                      <pre class="m-0 whitespace-pre">{{ file.content }}</pre>
                    </div>
                  </div>
                }
              } @else {
                <div class="p-8 text-center text-slate-400 text-xs">
                  <mat-icon class="text-3xl mx-auto mb-2 text-slate-300">source</mat-icon>
                  <span>Specification repository files will appear here when fetched from GitLab.</span>
                </div>
              }
            </div>
          }

          <!-- TAB 3: Generated Models -->
          @if (activeTab() === 'extracted') {
            <div class="space-y-4">
              
              <!-- Simplified Data Model JSON -->
              <div class="rounded-xl border border-slate-200 overflow-hidden">
                <div class="px-4 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <mat-icon class="text-slate-600 text-sm">schema</mat-icon>
                    <span class="text-xs font-semibold text-slate-800 font-mono">extracted/service-model.json</span>
                  </div>
                  <span class="text-[10px] text-slate-500">Canonical Extracted Model</span>
                </div>
                <div class="p-4 bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed">
                  <pre class="m-0">&#123;
  "serviceId": "{{ project().serviceProperties?.serviceName || project().name }}",
  "version": "{{ project().currentTag || '0.1.0' }}",
  "protocol": "{{ project().specType === 'suwiml' ? 'SOAP/SuwiML' : 'REST/JSON' }}",
  "fwiVersion": "{{ project().serviceProperties?.fwiVersionAbbr || 'v0205' }}",
  "operations": [
    @for (op of (project().operations || ['GeefStatus', 'VerwerkGegevens']); track op; let last = $last) {
    &#123;
      "name": "{{ op }}",
      "accessRole": "AUTH_PARTNER_ROLE",
      "auditRequired": true
    &#125;@if (!last) {,}
    }
  ]
&#125;</pre>
                </div>
              </div>

              <!-- gRPC Contract Representation -->
              <div class="rounded-xl border border-slate-200 overflow-hidden">
                <div class="px-4 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <mat-icon class="text-slate-600 text-sm">share</mat-icon>
                    <span class="text-xs font-semibold text-slate-800 font-mono">extracted/service.proto</span>
                  </div>
                  <span class="text-[10px] text-slate-500">Internal gRPC Bridge</span>
                </div>
                <div class="p-4 bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed">
                  <pre class="m-0">syntax = "proto3";
package specs.{{ protoPackage() }};

service {{ protoServiceName() }}Service &#123;
  @for (op of (project().operations || ['ExecuteService']); track op) {
  rpc {{ op }}({{ op }}Request) returns ({{ op }}Response);
  }
&#125;</pre>
                </div>
              </div>

            </div>
          }

          <!-- TAB 4: CI/CD Pipeline Jobs -->
          @if (activeTab() === 'pipeline') {
            <div class="space-y-4">
              <div class="p-4 rounded-xl border border-slate-200 bg-white">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <mat-icon class="text-emerald-600">task_alt</mat-icon>
                    <div>
                      <h4 class="text-xs font-bold text-slate-900">GitLab CI Artifact Pipeline</h4>
                      <p class="text-[11px] text-slate-500">Pipeline #{{ project().latestPipeline?.id || '94812' }} on branch <code>{{ project().default_branch }}</code></p>
                    </div>
                  </div>
                  <span class="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-50 text-emerald-700">
                    {{ project().latestPipeline?.status || 'success' | uppercase }}
                  </span>
                </div>

                <!-- Pipeline Stages -->
                <div class="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div class="p-2.5 rounded bg-slate-50 border border-slate-100">
                    <div class="text-[10px] text-slate-400">Stage 1</div>
                    <div class="font-semibold text-slate-800 mt-0.5">validate-specs</div>
                    <div class="text-[10px] text-emerald-600 mt-1 flex items-center gap-1">
                      <mat-icon class="text-xs">check</mat-icon> Passed (14s)
                    </div>
                  </div>
                  <div class="p-2.5 rounded bg-slate-50 border border-slate-100">
                    <div class="text-[10px] text-slate-400">Stage 2</div>
                    <div class="font-semibold text-slate-800 mt-0.5">extract-artifacts</div>
                    <div class="text-[10px] text-emerald-600 mt-1 flex items-center gap-1">
                      <mat-icon class="text-xs">check</mat-icon> Passed (32s)
                    </div>
                  </div>
                  <div class="p-2.5 rounded bg-slate-50 border border-slate-100">
                    <div class="text-[10px] text-slate-400">Stage 3</div>
                    <div class="font-semibold text-slate-800 mt-0.5">compat-checks</div>
                    <div class="text-[10px] text-emerald-600 mt-1 flex items-center gap-1">
                      <mat-icon class="text-xs">check</mat-icon> 0 Breaches (18s)
                    </div>
                  </div>
                  <div class="p-2.5 rounded bg-slate-50 border border-slate-100">
                    <div class="text-[10px] text-slate-400">Stage 4</div>
                    <div class="font-semibold text-slate-800 mt-0.5">publish-grpc</div>
                    <div class="text-[10px] text-emerald-600 mt-1 flex items-center gap-1">
                      <mat-icon class="text-xs">check</mat-icon> Artifacts Pushed
                    </div>
                  </div>
                </div>

                <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span class="text-xs text-slate-400">Commit SHA: {{ project().latestPipeline?.sha || 'a7f920bc81' }}</span>
                  <a
                    [href]="project().latestPipeline?.web_url"
                    target="_blank"
                    class="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                    <span>View in GitLab CI</span>
                    <mat-icon class="text-xs">open_in_new</mat-icon>
                  </a>
                </div>
              </div>
            </div>
          }

        </div>

        <!-- Drawer Footer -->
        <div class="p-4 px-6 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <a
            [href]="project().web_url"
            target="_blank"
            class="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1">
            <mat-icon class="text-sm">open_in_new</mat-icon>
            <span>Open in GitLab</span>
          </a>

          <button
            type="button"
            (click)="updateProjectViaZip.emit(currentProject())"
            class="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer">
            <mat-icon class="text-sm">upload_file</mat-icon>
            <span>Update Specification via Zip</span>
          </button>
        </div>

      </div>
    </div>
  `
})
export class ProjectDetailDrawer implements OnInit {
  readonly gitlab = inject(GitlabApi);

  readonly project = input.required<GitlabProject>();
  readonly closeRequested = output<void>();
  readonly updateProjectViaZip = output<GitlabProject>();

  readonly activeTab = signal<'service-properties' | 'contract' | 'extracted' | 'pipeline'>('service-properties');
  readonly isCheckingCommit = signal<boolean>(false);

  // Keep project data dynamically up to date with any changes in GitlabApi's project signal
  readonly currentProject = computed(() => {
    const fromApi = this.gitlab.projects().find(p => p.id === this.project().id);
    return fromApi || this.project();
  });

  async ngOnInit() {
    // When drawer opens, check if commit hash is verified or resolve lazy if uncached
    const p = this.currentProject();
    if (!this.gitlab.config().isDemoMode) {
      this.isCheckingCommit.set(true);
      try {
        await this.gitlab.resolveProjectMetadata(p, false);
      } finally {
        this.isCheckingCommit.set(false);
      }
    }
  }

  async forceRefresh() {
    this.isCheckingCommit.set(true);
    try {
      await this.gitlab.resolveProjectMetadata(this.currentProject(), true);
    } finally {
      this.isCheckingCommit.set(false);
    }
  }

  readonly protoPackage = computed(() => {
    return this.currentProject().path.replace(/-/g, '.');
  });

  readonly protoServiceName = computed(() => {
    return this.currentProject().name.replace(/[^a-zA-Z0-9]/g, '');
  });

  readonly rawPropertiesCount = computed(() => {
    const raw = this.currentProject().serviceProperties?.rawProperties;
    return raw ? Object.keys(raw).length : 0;
  });

  readonly rawPropertiesFormatted = computed(() => {
    const raw = this.currentProject().serviceProperties?.rawProperties;
    if (!raw) return '# No service.properties metadata loaded';
    return Object.entries(raw).map(([k, v]) => `${k}=${v}`).join('\n');
  });
}
