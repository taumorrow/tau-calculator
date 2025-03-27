// tau-calculator/src/app/calculator/tau-concept-browser.component.ts
import { Component, Input, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TauEducationService, TauConcept } from '../services/tau-education.service';
import { TauElectronService } from '../services/tau-electron.service';

@Component({
  selector: 'app-tau-concept-browser',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [TauEducationService, TauElectronService],
  template: `
    <div class="bg-slate-900 p-4 rounded-lg border border-slate-700 text-slate-300">
      <h2 class="text-xl font-semibold text-cyan-400 mb-4">Tau Language Concepts</h2>

      <div class="mb-4">
        <input
          type="text"
          placeholder="Search concepts..."
          [(ngModel)]="searchTerm"
          (input)="onSearch()"
          class="w-full p-2 rounded bg-slate-800 border border-slate-700 text-slate-300 focus:outline-none focus:border-cyan-500"
        />
      </div>

      <div class="flex flex-wrap mb-4 gap-2">
        <button
          *ngFor="let category of categories"
          (click)="selectCategory(category)"
          class="px-3 py-1 text-sm rounded-md transition-colors"
          [ngClass]="selectedCategory === category
            ? 'bg-cyan-700 text-white'
            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'"
        >
          {{ category }}
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div
          *ngFor="let concept of filteredConcepts"
          (click)="selectConcept(concept)"
          class="p-3 rounded-lg cursor-pointer transition-colors"
          [ngClass]="selectedConcept?.id === concept.id
            ? 'bg-slate-700 border border-cyan-600'
            : 'bg-slate-800 border border-slate-700 hover:border-slate-500'"
        >
          <h3 class="text-md font-medium text-cyan-400">{{ concept.title }}</h3>
          <p class="text-sm text-slate-400 mt-1 line-clamp-2">{{ concept.description }}</p>
          <div class="text-xs text-slate-500 mt-2">Category: {{ concept.category }}</div>
        </div>
      </div>

      <div *ngIf="filteredConcepts.length === 0" class="text-center p-4 bg-slate-800 rounded-lg">
        <p class="text-slate-400">No concepts found matching your search.</p>
      </div>

      <div *ngIf="selectedConcept" class="bg-slate-800 p-4 rounded-lg border border-slate-700 mt-4">
        <h3 class="text-lg font-medium text-cyan-400 mb-2">{{ selectedConcept.title }}</h3>
        <p class="text-sm text-slate-300 mb-4">{{ selectedConcept.description }}</p>

        <h4 class="text-md font-medium text-slate-300 mb-2">Examples</h4>
        <div class="mb-4">
          <div *ngFor="let example of selectedConcept.examples" class="bg-slate-900 p-3 rounded mb-2">
            <div class="flex justify-between">
              <span class="font-mono text-green-400">{{ example.command }}</span>
              <span class="font-mono text-cyan-400">→ {{ example.result }}</span>
            </div>
            <div class="text-xs text-slate-400 mt-1">{{ example.explanation }}</div>
          </div>
        </div>

        <h4 *ngIf="selectedConcept.parameters?.length" class="text-md font-medium text-slate-300 mb-2">Parameters</h4>
        <div *ngIf="selectedConcept.parameters?.length" class="mb-4">
          <div *ngFor="let param of selectedConcept.parameters" class="mb-2">
            <div class="flex">
              <span class="font-mono text-yellow-400 w-24 flex-shrink-0">{{ param.name }}</span>
              <span class="text-sm text-slate-300">{{ param.description }}</span>
            </div>
          </div>
        </div>

        <h4 *ngIf="selectedConcept.relatedTopics?.length" class="text-md font-medium text-slate-300 mb-2">Related Topics</h4>
        <div *ngIf="selectedConcept.relatedTopics?.length" class="flex flex-wrap gap-2">
          <button *ngFor="let topic of selectedConcept.relatedTopics"
                 (click)="selectConceptById(topic)"
                 class="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-xs rounded-md text-slate-300">
            {{ topic }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class TauConceptBrowserComponent implements OnInit, OnChanges {
  @Input() contextConcept: string | null = null;

  categories: string[] = ['All'];
  selectedCategory: string = 'All';
  selectedConcept: TauConcept | null = null;
  searchTerm: string = '';

  concepts: TauConcept[] = [];
  filteredConcepts: TauConcept[] = [];

  private tauEducationService = inject(TauEducationService);

  ngOnInit(): void {
    this.loadConcepts();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['contextConcept'] && this.contextConcept) {
      this.selectConceptById(this.contextConcept);
    }
  }

  loadConcepts(): void {
    this.tauEducationService.getTauConcepts().subscribe(concepts => {
      this.concepts = concepts;
      this.updateCategories();
      this.filterConcepts();

      // Select initial concept if context is provided
      if (this.contextConcept) {
        this.selectConceptById(this.contextConcept);
      }
    });
  }

  updateCategories(): void {
    const uniqueCategories = new Set<string>(this.concepts.map(concept => concept.category));
    this.categories = ['All', ...Array.from(uniqueCategories)];
  }

  selectCategory(category: string): void {
    this.selectedCategory = category;
    this.filterConcepts();
  }

  onSearch(): void {
    this.filterConcepts();
  }

  filterConcepts(): void {
    this.filteredConcepts = this.concepts.filter(concept => {
      const matchesCategory = this.selectedCategory === 'All' || concept.category === this.selectedCategory;
      const matchesSearch = this.searchTerm === '' ||
        concept.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        concept.description.toLowerCase().includes(this.searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }

  selectConcept(concept: TauConcept): void {
    this.selectedConcept = concept;
  }

  selectConceptById(id: string): void {
    const concept = this.concepts.find(c => c.id === id);
    if (concept) {
      // Ensure the category is selected to show this concept
      if (concept.category !== this.selectedCategory && this.selectedCategory !== 'All') {
        this.selectCategory(concept.category);
      }
      this.selectConcept(concept);
    }
  }
}
