'use client';

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { nanoid } from 'nanoid';
import { getClientStorage } from '@/lib/firebase/client';

/**
 * Upload a receipt image to Firebase Storage
 * @param userId - The user's ID
 * @param transactionId - The transaction's ID
 * @param file - The receipt image file (JPEG or PNG)
 * @returns The download URL and storage path
 */
export async function uploadReceipt(
  userId: string,
  transactionId: string,
  file: File
): Promise<{ url: string; path: string }> {
  const storage = getClientStorage();
  
  // Get file extension
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  
  // Create unique filename with nanoid
  const filename = `${nanoid(12)}.${ext}`;
  
  // Create storage path
  const path = `receipts/${userId}/${transactionId}/${filename}`;
  
  // Create storage reference
  const storageRef = ref(storage, path);
  
  // Upload the file
  await uploadBytes(storageRef, file, {
    contentType: file.type,
  });
  
  // Get download URL
  const url = await getDownloadURL(storageRef);
  
  return { url, path };
}

/**
 * Delete a receipt from Firebase Storage
 * @param path - The storage path of the receipt
 */
export async function deleteReceipt(path: string): Promise<void> {
  const storage = getClientStorage();
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
}

/**
 * Get the download URL for a receipt
 * @param path - The storage path of the receipt
 * @returns The download URL or null if not found
 */
export async function getReceiptDownloadUrl(path: string): Promise<string | null> {
  try {
    const storage = getClientStorage();
    const storageRef = ref(storage, path);
    return await getDownloadURL(storageRef);
  } catch {
    return null;
  }
}
