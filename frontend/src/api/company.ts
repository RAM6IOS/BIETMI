import { ApiError, request } from './http';

export { ApiError };

export interface Company {
  id: string;
  name: string;
  logoUrl: string | null;
  siegeSocial: string | null;
  ville: string | null;
  mobile: string | null;
  telFax: string | null;
  rc: string | null;
  nif: string | null;
  ain: string | null;
  banqueBaraka: string | null;
  updatedAt: string;
}

export type CompanyUpdateInput = Partial<
  Pick<
    Company,
    | 'name'
    | 'logoUrl'
    | 'siegeSocial'
    | 'ville'
    | 'mobile'
    | 'telFax'
    | 'rc'
    | 'nif'
    | 'ain'
    | 'banqueBaraka'
  >
>;

export function getCompany() {
  return request<Company>('/company');
}

export function updateCompany(input: CompanyUpdateInput) {
  return request<Company>('/company', {
    method: 'PATCH',
    body: input,
  });
}