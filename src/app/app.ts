import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ConnectionModal } from './components/connection-modal/connection-modal';
import { Header } from './components/header/header';
import { ProjectDetailDrawer } from './components/project-detail/project-detail-drawer';
import { ProjectExplorer } from './components/project-explorer/project-explorer';
import { SpecWizard } from './components/spec-wizard/spec-wizard';
import { GitlabProject } from './models/gitlab.models';
import { GitlabApi } from './services/gitlab-api';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatIconModule,
    Header,
    ProjectExplorer,
    ConnectionModal,
    ProjectDetailDrawer,
    SpecWizard
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  readonly gitlab = inject(GitlabApi);

  readonly currentTab = signal<'projects' | 'subgroups' | 'pipelines'>('projects');
  readonly isSettingsOpen = signal<boolean>(false);
  readonly isWizardOpen = signal<boolean>(false);
  readonly selectedProjectForInspection = signal<GitlabProject | null>(null);
  readonly selectedProjectForWizard = signal<GitlabProject | null>(null);

  openWizard(project?: GitlabProject) {
    this.selectedProjectForWizard.set(project || null);
    this.isWizardOpen.set(true);
  }

  closeWizard() {
    this.isWizardOpen.set(false);
    this.selectedProjectForWizard.set(null);
  }

  onWizardFinished() {
    this.closeWizard();
    this.gitlab.refreshData();
  }

  inspectProject(project: GitlabProject) {
    this.selectedProjectForInspection.set(project);
  }

  closeInspection() {
    this.selectedProjectForInspection.set(null);
  }

  updateProjectFromDrawer(project: GitlabProject) {
    this.closeInspection();
    this.openWizard(project);
  }
}
