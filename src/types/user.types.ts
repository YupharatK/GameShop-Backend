// src/types/user.types.ts
export interface UserRegistrationData {
  username: string;
  email: string;
  password_hash: string;
  profile_image_url: string;
}

export interface UserUpdateData {
  username?: string;
  email?: string;
  profile_image_url?: string;
}