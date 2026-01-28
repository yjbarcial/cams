import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Generate unique filename
export const generateUniqueFilename = (originalName) => {
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1E9);
  const ext = path.extname(originalName);
  const name = path.basename(originalName, ext).replace(/[^a-zA-Z0-9]/g, '-');
  return `${name}-${timestamp}-${random}${ext}`;
};

// Get file extension
export const getFileExtension = (filename) => {
  return path.extname(filename).toLowerCase();
};

// Get file MIME type
export const getMimeType = (filename) => {
  const ext = getFileExtension(filename);
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.txt': 'text/plain',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed'
  };
  return mimeTypes[ext] || 'application/octet-stream';
};

// Format file size
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

// Delete file
export const deleteFile = async (filePath) => {
  try {
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

// Check if file exists
export const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

// Ensure directory exists
export const ensureDirectory = async (dirPath) => {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    return true;
  } catch (error) {
    console.error('Error creating directory:', error);
    return false;
  }
};

export default {
  generateUniqueFilename,
  getFileExtension,
  getMimeType,
  formatFileSize,
  deleteFile,
  fileExists,
  ensureDirectory
};
