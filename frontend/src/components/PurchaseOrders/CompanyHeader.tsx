import type { Company } from '../../api/company';
import companyLogo from '../../assets/company-logo.png';
import { isValidLogoSource } from '../../utils/companyLogo';

export function CompanyHeader({ company }: { company: Company | null }) {
  if (!company) return null;

  const logo = isValidLogoSource(company.logoUrl) ? company.logoUrl : companyLogo;

  return (
    <div className="flex items-start gap-3">
      <img
        src={logo}
        alt=""
        className="h-16 w-16 object-contain"
      />
      <div>
        <p className="text-xl font-bold">{company.name}</p>
        <p className="mt-1 text-xs text-gray-700 leading-relaxed">
          {company.siegeSocial && (
            <>
              Siège social : <span className="text-gray-700">{company.siegeSocial}</span>
              <br />
            </>
          )}
          {company.mobile && (
            <>
              Mobile : <span className="text-gray-700">{company.mobile}</span>{' '}
            </>
          )}
          {company.telFax && (
            <>
              &amp; Tel/Fax :{' '}
              <span className="text-gray-700">{company.telFax}</span>
            </>
          )}
          {company.mobile && company.telFax && <br />}
          {company.rc && (
            <>
              R.C n° : <span className="text-gray-700">{company.rc}</span>{' '}
            </>
          )}
          {company.nif && (
            <>
              N.I.F n° : <span className="text-gray-700">{company.nif}</span>{' '}
            </>
          )}
          {company.ain && (
            <>A.I.N : <span className="text-gray-700">{company.ain}</span></>
          )}
          {(company.rc || company.nif || company.ain) && <br />}
          {company.banqueBaraka && (
            <>
              Banque el baraka n° :{' '}
              <span className="text-gray-700">{company.banqueBaraka}</span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}