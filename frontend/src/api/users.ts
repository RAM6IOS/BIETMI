import { request } from './http';

export type UserRole = 'admin' | 'commercial' | 'accountant' | 'purchasing';

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface CreatedUser extends User {
  tempPassword: string;
}

export interface CreateUserInput {
  fullName: string;
  username: string;
  role: UserRole;
  tempPassword?: string;
}

export interface UpdateUserInput {
  fullName?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface PaginatedUsers {
  data: User[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ListUsersParams {
  search?: string;
  sortBy?: 'username' | 'fullName' | 'role' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export function listUsers(params: ListUsersParams = {}) {
  return request<PaginatedUsers>('/users', {
    params: {
      search: params.search,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      page: params.page ? String(params.page) : undefined,
      limit: params.limit ? String(params.limit) : undefined,
    },
  });
}

export function createUser(input: CreateUserInput) {
  return request<CreatedUser>('/users', { method: 'POST', body: input });
}

export function updateUser(id: string, input: UpdateUserInput) {
  return request<User>(`/users/${id}`, { method: 'PATCH', body: input });
}

export function changeMyPassword(input: ChangePasswordInput) {
  return request<{ success: boolean }>('/users/me/password', {
    method: 'PATCH',
    body: input,
  });
}

export function resetUserPassword(id: string) {
  return request<{ tempPassword: string; mustChangePassword: boolean }>(
    `/users/${id}/reset-password`,
    { method: 'PATCH' },
  );
}

export function deleteUser(id: string) {
  return request<User>(`/users/${id}`, { method: 'DELETE' });
}
