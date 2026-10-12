import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { GitlabUser } from '../../models/gitlab.models';
import { GitlabApi } from '../../services/gitlab-api';

@Component({
  selector: 'app-connection-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatIconModule],
  template: `
    <div class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        <!-- Header -->
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <mat-icon class="text-xl">tune</mat-icon>
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900 font-display">GitLab Environment & Connection</h3>
              <p class="text-xs text-slate-500">Choose between direct browser live connection or offline demo mode</p>
            </div>
          </div>
          <button
            type="button"
            (click)="modalClosed.emit()"
            class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <mat-icon class="text-lg">close</mat-icon>
          </button>
        </div>

        <!-- Form Body -->
        <form [formGroup]="form" (ngSubmit)="onSave()" class="p-6 space-y-5">
          
          <!-- Mode Selection Cards -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            <!-- Card 1: Live Private GitLab -->
            <button
              type="button"
              (click)="selectMode(false)"
              class="p-4 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer"
              [class.border-emerald-500]="!form.get('isDemoMode')?.value"
              [class.bg-emerald-50/40]="!form.get('isDemoMode')?.value"
              [class.ring-2]="!form.get('isDemoMode')?.value"
              [class.ring-emerald-500/20]="!form.get('isDemoMode')?.value"
              [class.border-slate-200]="form.get('isDemoMode')?.value"
              [class.bg-white]="form.get('isDemoMode')?.value"
              [class.hover:border-slate-300]="form.get('isDemoMode')?.value">
              <div>
                <div class="flex items-center justify-between mb-2">
                  <div class="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <mat-icon class="text-base">public</mat-icon>
                  </div>
                  @if (!form.get('isDemoMode')?.value) {
                    <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Active</span>
                  }
                </div>
                <div class="text-sm font-bold text-slate-900">Live GitLab Instance</div>
                <p class="text-xs text-slate-500 mt-1 leading-relaxed">
                  Direct browser HTTPS connection to your private GitLab instance using your PAT or OAuth2 token.
                </p>
              </div>
            </button>

            <!-- Card 2: Demo Mode -->
            <button
              type="button"
              (click)="selectMode(true)"
              class="p-4 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer"
              [class.border-indigo-500]="form.get('isDemoMode')?.value"
              [class.bg-indigo-50/40]="form.get('isDemoMode')?.value"
              [class.ring-2]="form.get('isDemoMode')?.value"
              [class.ring-indigo-500/20]="form.get('isDemoMode')?.value"
              [class.border-slate-200]="!form.get('isDemoMode')?.value"
              [class.bg-white]="!form.get('isDemoMode')?.value"
              [class.hover:border-slate-300]="!form.get('isDemoMode')?.value">
              <div>
                <div class="flex items-center justify-between mb-2">
                  <div class="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center">
                    <mat-icon class="text-base">science</mat-icon>
                  </div>
                  @if (form.get('isDemoMode')?.value) {
                    <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">Active</span>
                  }
                </div>
                <div class="text-sm font-bold text-slate-900">Offline Demo Mode</div>
                <p class="text-xs text-slate-500 mt-1 leading-relaxed">
                  Preloaded SuwiML SOAP (WSDL/XSD) and OpenAPI repositories under <code>service-specifications</code>.
                </p>
              </div>
            </button>

          </div>

          <!-- Configuration Fields for Live Mode -->
          @if (!form.get('isDemoMode')?.value) {
            <div class="space-y-4 pt-2 border-t border-slate-100 animate-in fade-in duration-150">
              
              <div class="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-start gap-2">
                <mat-icon class="text-indigo-600 text-sm shrink-0 mt-0.5">info</mat-icon>
                <span>All requests are issued directly from your browser to your GitLab instance. No backend proxy or third-party server is used.</span>
              </div>

              <div>
                <label for="gl-host-url" class="block text-xs font-semibold text-slate-700 mb-1">
                  GitLab Instance Base URL
                </label>
                <div class="relative">
                  <input
                    id="gl-host-url"
                    type="url"
                    formControlName="hostUrl"
                    placeholder="https://gitlab.example.corp"
                    class="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono transition-colors" />
                </div>
                <span class="text-[11px] text-slate-400 mt-1 block">Full HTTPS URL of your GitLab instance (e.g. https://gitlab.internal.corp or https://gitlab.com)</span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label for="gl-token-type" class="block text-xs font-semibold text-slate-700 mb-1">
                    Token Type
                  </label>
                  <select
                    id="gl-token-type"
                    formControlName="tokenType"
                    class="w-full text-xs px-3 py-2.5 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors">
                    <option value="pat">Personal Access Token (PAT)</option>
                    <option value="oauth">OAuth2 Bearer Token</option>
                  </select>
                </div>

                <div class="sm:col-span-2">
                  <label for="gl-token" class="block text-xs font-semibold text-slate-700 mb-1">
                    Access Token / Secret
                  </label>
                  <div class="relative">
                    <input
                      id="gl-token"
                      [type]="showToken() ? 'text' : 'password'"
                      formControlName="token"
                      placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
                      class="w-full text-xs pl-3.5 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono transition-colors" />
                    <button
                      type="button"
                      (click)="showToken.set(!showToken())"
                      class="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600">
                      <mat-icon class="text-base">{{ showToken() ? 'visibility_off' : 'visibility' }}</mat-icon>
                    </button>
                  </div>
                  <span class="text-[11px] text-slate-400 mt-1 block">Required scopes: <code>read_api</code> (or <code>api</code>) and <code>write_repository</code></span>
                </div>
              </div>

              <div>
                <label for="gl-root-group" class="block text-xs font-semibold text-slate-700 mb-1">
                  Root Specifications Group Path
                </label>
                <input
                  id="gl-root-group"
                  type="text"
                  formControlName="rootGroupPath"
                  placeholder="service-specifications"
                  class="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono transition-colors" />
                <span class="text-[11px] text-slate-400 mt-1 block">The top group containing all specification subgroups (e.g. <code>service-specifications</code>)</span>
              </div>

            </div>
          } @else {
            <div class="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs text-indigo-900 leading-relaxed">
              <span class="font-bold">Offline Demo Mode Active</span>
              <p class="mt-1 text-indigo-800/80">
                You are currently browsing the offline demo environment. You can unpack WSDL/OpenAPI zip files, test CRLF-to-LF conversion, compute diffs, and preview Conventional Commits without connecting to an actual GitLab instance.
              </p>
            </div>
          }

          <!-- Client-Side Metadata Cache Status -->
          <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <mat-icon class="text-base text-indigo-600">dns</mat-icon>
                <span class="font-semibold text-slate-800">Persistent Metadata Cache</span>
                <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-indigo-100 text-indigo-800 uppercase">
                  {{ gitlab.cachedStats().storageType }}
                </span>
              </div>
              <button
                type="button"
                [disabled]="isClearingCache() || gitlab.cachedStats().count === 0"
                (click)="onClearCache()"
                class="px-2.5 py-1 text-[11px] font-medium text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 rounded border border-rose-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer">
                <mat-icon class="text-xs" [class.animate-spin]="isClearingCache()">delete_sweep</mat-icon>
                <span>Clear Cache</span>
              </button>
            </div>
            <p class="text-[11px] text-slate-500 leading-relaxed">
              {{ gitlab.cachedStats().count }} project specification(s) cached locally. On startup, project metadata is loaded instantly from storage with zero redundant GitLab API calls; specifications are re-verified only when inspecting or refreshing if the default branch commit hash changed.
            </p>
          </div>

          <!-- Connection Diagnostic Test Result -->
          @if (testMessage()) {
            <div
              class="p-3.5 rounded-xl text-xs flex items-start gap-3"
              [class.bg-emerald-50]="testSuccess()"
              [class.text-emerald-900]="testSuccess()"
              [class.border]="true"
              [class.border-emerald-200]="testSuccess()"
              [class.bg-rose-50]="!testSuccess()"
              [class.text-rose-900]="!testSuccess()"
              [class.border-rose-200]="!testSuccess()">
              <mat-icon class="text-base shrink-0 mt-0.5">
                {{ testSuccess() ? 'check_circle' : 'error_outline' }}
              </mat-icon>
              <div class="leading-relaxed flex-1">
                <div class="font-semibold">{{ testSuccess() ? 'Connection Verified' : 'Connection Failed' }}</div>
                <div class="mt-0.5">{{ testMessage() }}</div>
                @if (testedUser(); as u) {
                  <div class="mt-2 pt-2 border-t border-emerald-200 flex items-center gap-2 font-mono text-[11px]">
                    <span class="font-bold">{{ u.name }}</span>
                    <span>(@{{ u.username }})</span>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Action Buttons -->
          <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            @if (!form.get('isDemoMode')?.value) {
              <button
                type="button"
                (click)="onTestConnection()"
                [disabled]="isTesting()"
                class="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer">
                @if (isTesting()) {
                  <mat-icon class="text-sm animate-spin">refresh</mat-icon>
                  <span>Verifying from Browser...</span>
                } @else {
                  <mat-icon class="text-sm">electrical_services</mat-icon>
                  <span>Test Direct Connection</span>
                }
              </button>
            } @else {
              <div></div>
            }

            <div class="flex items-center gap-2">
              <button
                type="button"
                (click)="modalClosed.emit()"
                class="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors">
                Cancel
              </button>
              
              <button
                type="submit"
                class="px-4 py-2 text-xs font-semibold text-white rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                [class.bg-emerald-600]="!form.get('isDemoMode')?.value"
                [class.hover:bg-emerald-700]="!form.get('isDemoMode')?.value"
                [class.bg-indigo-600]="form.get('isDemoMode')?.value"
                [class.hover:bg-indigo-700]="form.get('isDemoMode')?.value">
                <mat-icon class="text-sm">save</mat-icon>
                <span>{{ form.get('isDemoMode')?.value ? 'Use Demo Mode' : 'Connect to Live GitLab' }}</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  `
})
export class ConnectionModal {
  readonly gitlab = inject(GitlabApi);
  readonly modalClosed = output<void>();

  readonly showToken = signal<boolean>(false);
  readonly testMessage = signal<string | null>(null);
  readonly testSuccess = signal<boolean>(false);
  readonly testedUser = signal<GitlabUser | null>(null);
  readonly isTesting = signal<boolean>(false);
  readonly isClearingCache = signal<boolean>(false);

  readonly form = new FormGroup({
    hostUrl: new FormControl(this.gitlab.config().hostUrl, { nonNullable: true, validators: [Validators.required] }),
    token: new FormControl(this.gitlab.config().token, { nonNullable: true }),
    tokenType: new FormControl(this.gitlab.config().tokenType, { nonNullable: true }),
    rootGroupPath: new FormControl(this.gitlab.config().rootGroupPath, { nonNullable: true, validators: [Validators.required] }),
    isDemoMode: new FormControl(this.gitlab.config().isDemoMode, { nonNullable: true })
  });

  selectMode(isDemo: boolean) {
    this.form.get('isDemoMode')?.setValue(isDemo);
    this.testMessage.set(null);
  }

  async onTestConnection() {
    this.isTesting.set(true);
    this.testMessage.set(null);
    this.testedUser.set(null);

    const testConfig = { ...this.form.getRawValue(), isDemoMode: false };
    const result = await this.gitlab.testConnection(testConfig);
    
    this.isTesting.set(false);
    this.testSuccess.set(result.success);
    this.testMessage.set(result.message);
    if (result.user) {
      this.testedUser.set(result.user);
    }
  }

  async onClearCache() {
    this.isClearingCache.set(true);
    try {
      await this.gitlab.clearCache();
    } finally {
      this.isClearingCache.set(false);
    }
  }

  onSave() {
    this.gitlab.saveConfig(this.form.getRawValue());
    this.modalClosed.emit();
  }
}
