import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { GitlabApi } from '../../services/gitlab-api';

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <header class="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between gap-6 h-16">
          
          <!-- Zone 1: Single Brand Wordmark -->
          <div class="flex items-center gap-3 shrink-0">
            <div class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <mat-icon class="text-xl">hub</mat-icon>
            </div>
            <span class="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
              GitLab Spec Registry
            </span>
          </div>

          <!-- Zone 2: Navigation Links & Prominent Live/Demo Switcher -->
          <nav class="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              type="button"
              (click)="navigateTab.emit('projects')"
              class="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
              [class.text-indigo-600]="activeTab() === 'projects'"
              [class.font-semibold]="activeTab() === 'projects'">
              <mat-icon class="text-base">folder_special</mat-icon>
              Specifications
            </button>
            <button
              type="button"
              (click)="navigateTab.emit('subgroups')"
              class="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
              [class.text-indigo-600]="activeTab() === 'subgroups'"
              [class.font-semibold]="activeTab() === 'subgroups'">
              <mat-icon class="text-base">account_tree</mat-icon>
              Subgroups
            </button>
            <button
              type="button"
              (click)="navigateTab.emit('pipelines')"
              class="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
              [class.text-indigo-600]="activeTab() === 'pipelines'"
              [class.font-semibold]="activeTab() === 'pipelines'">
              <mat-icon class="text-base">alt_route</mat-icon>
              Pipelines
            </button>
          </nav>

          <!-- Zone 3: Mode Switcher & Primary Action -->
          <div class="flex items-center gap-3 shrink-0">
            
            <!-- Prominent Live GitLab vs Demo Switcher -->
            <div class="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200">
              <button
                type="button"
                (click)="onSelectLive()"
                class="px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer"
                [class.bg-white]="!gitlab.config().isDemoMode"
                [class.text-emerald-800]="!gitlab.config().isDemoMode"
                [class.shadow-xs]="!gitlab.config().isDemoMode"
                [class.text-slate-500]="gitlab.config().isDemoMode"
                [class.hover:text-slate-800]="gitlab.config().isDemoMode">
                <span
                  class="w-2 h-2 rounded-full"
                  [class.bg-emerald-500]="!gitlab.config().isDemoMode"
                  [class.bg-slate-300]="gitlab.config().isDemoMode"></span>
                <span>Live GitLab</span>
              </button>
              
              <button
                type="button"
                (click)="onSelectDemo()"
                class="px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer"
                [class.bg-white]="gitlab.config().isDemoMode"
                [class.text-indigo-800]="gitlab.config().isDemoMode"
                [class.shadow-xs]="gitlab.config().isDemoMode"
                [class.text-slate-500]="!gitlab.config().isDemoMode"
                [class.hover:text-slate-800]="!gitlab.config().isDemoMode">
                <span
                  class="w-2 h-2 rounded-full"
                  [class.bg-indigo-500]="gitlab.config().isDemoMode"
                  [class.bg-slate-300]="!gitlab.config().isDemoMode"></span>
                <span>Demo Mode</span>
              </button>
            </div>

            <!-- Settings Button -->
            <button
              type="button"
              (click)="openSettings.emit()"
              title="Configure GitLab instance credentials & group"
              class="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200">
              <mat-icon class="text-base">tune</mat-icon>
            </button>

            <!-- Primary Action -->
            <button
              type="button"
              (click)="startWizard.emit()"
              class="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0">
              <mat-icon class="text-base">publish</mat-icon>
              <span>+ Import Spec</span>
            </button>

          </div>

        </div>
      </div>
    </header>
  `
})
export class Header {
  readonly gitlab = inject(GitlabApi);

  readonly activeTab = input<string>('projects');
  readonly navigateTab = output<string>();
  readonly openSettings = output<void>();
  readonly startWizard = output<void>();

  onSelectLive() {
    const isReady = this.gitlab.switchToLive();
    if (!isReady) {
      // Need to input credentials
      this.openSettings.emit();
    }
  }

  onSelectDemo() {
    this.gitlab.switchToDemo();
  }
}
