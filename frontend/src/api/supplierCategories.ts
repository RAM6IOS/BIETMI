import { request } from './http';

export interface SupplierCategory {
  id: string;
  name: string;
  createdAt: string;
}

export interface SupplierCategoryInput {
  name: string;
}

export function listSupplierCategories() {
  return request<SupplierCategory[]>('/supplier-categories');
}

export function createSupplierCategory(input: SupplierCategoryInput) {
  return request<SupplierCategory>('/supplier-categories', {
    method: 'POST',
    body: input,
  });
}

export function updateSupplierCategory(
  id: string,
  input: SupplierCategoryInput,
) {
  return request<SupplierCategory>(`/supplier-categories/${id}`, {
    method: 'PATCH',
    body: input,
  });
}

export function deleteSupplierCategory(id: string) {
  return request<void>(`/supplier-categories/${id}`, { method: 'DELETE' });
}