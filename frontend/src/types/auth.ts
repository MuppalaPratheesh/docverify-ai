export type UserRole = 'APPLICANT' | 'REVIEWER' | 'ADMIN';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
};

export type ApiErrorBody = {
  success: false;
  error: {
    message: string;
  };
};

export type AuthSuccessBody = {
  success: true;
  data: {
    user: AuthUser;
  };
};
