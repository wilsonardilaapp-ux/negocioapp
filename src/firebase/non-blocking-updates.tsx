'use client';
    
import {
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  CollectionReference,
  DocumentReference,
  SetOptions,
} from 'firebase/firestore';

/**
 * Initiates a setDoc operation for a document reference.
 * Returns the promise from the underlying Firestore SDK call.
 */
export function setDocumentNonBlocking(docRef: DocumentReference, data: any, options?: SetOptions) {
  return options ? setDoc(docRef, data, options) : setDoc(docRef, data);
}


/**
 * Initiates an addDoc operation for a collection reference.
 * Returns the promise from the underlying Firestore SDK call.
 */
export function addDocumentNonBlocking(colRef: CollectionReference, data: any) {
  return addDoc(colRef, data);
}


/**
 * Initiates an updateDoc operation for a document reference.
 * Returns the promise from the underlying Firestore SDK call.
 */
export function updateDocumentNonBlocking(docRef: DocumentReference, data: any) {
  return updateDoc(docRef, data);
}


/**
 * Initiates a deleteDoc operation for a document reference.
 * Returns the promise from the underlying Firestore SDK call.
 */
export function deleteDocumentNonBlocking(docRef: DocumentReference) {
  return deleteDoc(docRef);
}
