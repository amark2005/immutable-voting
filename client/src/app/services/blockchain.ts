// client/src/app/services/blockchain.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// ... (Block interface remains the same)

@Injectable({
  providedIn: 'root'
})
export class BlockchainService {
  private http = inject(HttpClient);
  private apiUrl = 'https://immutable-voting.vercel.app/'; // Adjust for production later

  // NEW: Login method
  login(credentials: { usercode: string; passcode: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials);
  }

  // NEW: Get candidates method
  getCandidates(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/candidates`);
  }

  // MODIFIED: Submit vote method
  submitVote(voteData: { usercode: string; candidate: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/vote`, voteData);
  }

  getChain(): Observable<any[]> { // Keeping this for potential admin view
    return this.http.get<any[]>(`${this.apiUrl}/chain`);
  }

}