export type ResourceParentType = 'LESSON' | 'SUBMISSION';

export interface ResourceDto {
  id: string;
  lessonId?: string | null;
  parentType: ResourceParentType;
  uploadedBy: string;
  fileName: string;
  fileSizeBytes: number | string;
  mimeType: string;
  createdAt: string;
}

export interface ResourcePreviewResponse {
  url: string;
  expiresIn: number;
  mimeType: string;
  fileName: string;
}

