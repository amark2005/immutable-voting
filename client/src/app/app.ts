// client/src/app/app.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { BlockchainService } from './services/blockchain';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, HttpClientModule, ReactiveFormsModule],
  providers: [BlockchainService],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  // Services
  private blockchainService = inject(BlockchainService);
  private fb = inject(FormBuilder);

  // State Management
  appState: 'login' | 'voting' | 'voted' = 'login';
  currentUsercode: string | null = null;
  candidates: string[] = [];
  errorMessage: string | null = null;
  
  successMessage: string | null = null;

  // Forms
  loginForm = this.fb.group({
    usercode: ['', Validators.required],
    passcode: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(4)]]
  });


  ngOnInit() {}

  onLogin() {
  if (this.loginForm.invalid) return;

  // Clear previous messages before the API call
  this.errorMessage = null;
  console.log('Checkpoint 1: Attempting to log in...');

  const credentials = this.loginForm.value as { usercode: string; passcode: string };
  
  this.blockchainService.login(credentials).subscribe({
    next: () => {
      // This block runs on a SUCCESSFUL login
      console.log('Checkpoint 2: Login successful.');
      this.currentUsercode = credentials.usercode;
      this.loadCandidates();
      this.appState = 'voting';
    },
    error: (err) => {
      // This block runs on an ERROR
      console.log('Checkpoint 2: Login FAILED.');
      console.log('The full error object from the API is:', err);
      
      // This is the critical line that sets the message
      this.errorMessage = err.error.error || 'An unknown error occurred.';
      
      console.log('Checkpoint 3: this.errorMessage is now set to:', this.errorMessage);
    }
  });
  }
  
  // In client/src/app/app.component.ts

loadCandidates() {
  console.log('Checkpoint 1: The loadCandidates function was called.');

  this.blockchainService.getCandidates().subscribe(data => {
    console.log('Checkpoint 2: Received this data from the API:', data);
    this.candidates = data;
    console.log('Checkpoint 3: The component\'s candidates array is now:', this.candidates);
  });
}

  onVote(candidate: string) {
    if (!this.currentUsercode) return;

    // Confirmation step
    const isConfirmed = confirm(`Are you sure you want to vote for ${candidate}?`);
    if (!isConfirmed) {
      return;
    }

    this.blockchainService.submitVote({ usercode: this.currentUsercode, candidate }).subscribe({
      next: () => {
        this.appState = 'voted';
        // Automatically reset the session after 10 seconds
        setTimeout(() => {
          this.resetSession();
        }, 10000); // 10 seconds
      },
      error: (err) => {
        this.errorMessage = err.error.error || 'Failed to cast vote.';
        // Optionally, reset or show an error screen
      }
    });
  }

  resetSession() {
    this.appState = 'login';
    this.currentUsercode = null;
    this.candidates = [];
    this.errorMessage = null;
    this.loginForm.reset();
  }

}
