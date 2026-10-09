export type CountryDialOption = {
  iso2: string
  dialCode: string
  name: string
}

export const DEFAULT_DIAL_CODE = ''

export const COUNTRY_DIAL_OPTIONS: CountryDialOption[] = [
  { iso2: 'EG', dialCode: '+20', name: 'Egypt' },
  { iso2: 'ZA', dialCode: '+27', name: 'South Africa' },
  { iso2: 'GR', dialCode: '+30', name: 'Greece' },
  { iso2: 'NL', dialCode: '+31', name: 'Netherlands' },
  { iso2: 'BE', dialCode: '+32', name: 'Belgium' },
  { iso2: 'FR', dialCode: '+33', name: 'France' },
  { iso2: 'ES', dialCode: '+34', name: 'Spain' },
  { iso2: 'HU', dialCode: '+36', name: 'Hungary' },
  { iso2: 'IT', dialCode: '+39', name: 'Italy' },
  { iso2: 'RO', dialCode: '+40', name: 'Romania' },
  { iso2: 'CH', dialCode: '+41', name: 'Switzerland' },
  { iso2: 'AT', dialCode: '+43', name: 'Austria' },
  { iso2: 'GG', dialCode: '+44', name: 'Guernsey' },
  { iso2: 'IM', dialCode: '+44', name: 'Isle of Man' },
  { iso2: 'JE', dialCode: '+44', name: 'Jersey' },
  { iso2: 'GB', dialCode: '+44', name: 'United Kingdom' },
  { iso2: 'DK', dialCode: '+45', name: 'Denmark' },
  { iso2: 'SE', dialCode: '+46', name: 'Sweden' },
  { iso2: 'BV', dialCode: '+47', name: 'Bouvet Island' },
  { iso2: 'NO', dialCode: '+47', name: 'Norway' },
  { iso2: 'PL', dialCode: '+48', name: 'Poland' },
  { iso2: 'DE', dialCode: '+49', name: 'Germany' },
  { iso2: 'PE', dialCode: '+51', name: 'Peru' },
  { iso2: 'MX', dialCode: '+52', name: 'Mexico' },
  { iso2: 'CU', dialCode: '+53', name: 'Cuba' },
  { iso2: 'AR', dialCode: '+54', name: 'Argentina' },
  { iso2: 'BR', dialCode: '+55', name: 'Brazil' },
  { iso2: 'CL', dialCode: '+56', name: 'Chile' },
  { iso2: 'CO', dialCode: '+57', name: 'Colombia' },
  { iso2: 'VE', dialCode: '+58', name: 'Venezuela' },
  { iso2: 'MY', dialCode: '+60', name: 'Malaysia' },
  { iso2: 'AU', dialCode: '+61', name: 'Australia' },
  { iso2: 'CX', dialCode: '+61', name: 'Christmas Island' },
  { iso2: 'CC', dialCode: '+61', name: 'Cocos (Keeling) Islands' },
  { iso2: 'ID', dialCode: '+62', name: 'Indonesia' },
  { iso2: 'PH', dialCode: '+63', name: 'Philippines' },
  { iso2: 'NZ', dialCode: '+64', name: 'New Zealand' },
  { iso2: 'PN', dialCode: '+64', name: 'Pitcairn Islands' },
  { iso2: 'SG', dialCode: '+65', name: 'Singapore' },
  { iso2: 'TH', dialCode: '+66', name: 'Thailand' },
  { iso2: 'RU', dialCode: '+73', name: 'Russia' },
  { iso2: 'KZ', dialCode: '+76', name: 'Kazakhstan' },
  { iso2: 'JP', dialCode: '+81', name: 'Japan' },
  { iso2: 'KR', dialCode: '+82', name: 'South Korea' },
  { iso2: 'VN', dialCode: '+84', name: 'Vietnam' },
  { iso2: 'CN', dialCode: '+86', name: 'China' },
  { iso2: 'TR', dialCode: '+90', name: 'Turkiye' },
  { iso2: 'IN', dialCode: '+91', name: 'India' },
  { iso2: 'PK', dialCode: '+92', name: 'Pakistan' },
  { iso2: 'AF', dialCode: '+93', name: 'Afghanistan' },
  { iso2: 'LK', dialCode: '+94', name: 'Sri Lanka' },
  { iso2: 'MM', dialCode: '+95', name: 'Myanmar' },
  { iso2: 'IR', dialCode: '+98', name: 'Iran' },
  { iso2: 'SS', dialCode: '+211', name: 'South Sudan' },
  { iso2: 'MA', dialCode: '+212', name: 'Morocco' },
  { iso2: 'DZ', dialCode: '+213', name: 'Algeria' },
  { iso2: 'TN', dialCode: '+216', name: 'Tunisia' },
  { iso2: 'LY', dialCode: '+218', name: 'Libya' },
  { iso2: 'GM', dialCode: '+220', name: 'Gambia' },
  { iso2: 'SN', dialCode: '+221', name: 'Senegal' },
  { iso2: 'MR', dialCode: '+222', name: 'Mauritania' },
  { iso2: 'ML', dialCode: '+223', name: 'Mali' },
  { iso2: 'GN', dialCode: '+224', name: 'Guinea' },
  { iso2: 'CI', dialCode: '+225', name: 'Ivory Coast' },
  { iso2: 'BF', dialCode: '+226', name: 'Burkina Faso' },
  { iso2: 'NE', dialCode: '+227', name: 'Niger' },
  { iso2: 'TG', dialCode: '+228', name: 'Togo' },
  { iso2: 'BJ', dialCode: '+229', name: 'Benin' },
  { iso2: 'MU', dialCode: '+230', name: 'Mauritius' },
  { iso2: 'LR', dialCode: '+231', name: 'Liberia' },
  { iso2: 'SL', dialCode: '+232', name: 'Sierra Leone' },
  { iso2: 'GH', dialCode: '+233', name: 'Ghana' },
  { iso2: 'NG', dialCode: '+234', name: 'Nigeria' },
  { iso2: 'TD', dialCode: '+235', name: 'Chad' },
  { iso2: 'CF', dialCode: '+236', name: 'Central African Republic' },
  { iso2: 'CM', dialCode: '+237', name: 'Cameroon' },
  { iso2: 'CV', dialCode: '+238', name: 'Cape Verde' },
  { iso2: 'ST', dialCode: '+239', name: 'Sao Tome and Principe' },
  { iso2: 'GQ', dialCode: '+240', name: 'Equatorial Guinea' },
  { iso2: 'GA', dialCode: '+241', name: 'Gabon' },
  { iso2: 'CG', dialCode: '+242', name: 'Congo' },
  { iso2: 'CD', dialCode: '+243', name: 'DR Congo' },
  { iso2: 'AO', dialCode: '+244', name: 'Angola' },
  { iso2: 'GW', dialCode: '+245', name: 'Guinea-Bissau' },
  { iso2: 'IO', dialCode: '+246', name: 'British Indian Ocean Territory' },
  { iso2: 'SC', dialCode: '+248', name: 'Seychelles' },
  { iso2: 'SD', dialCode: '+249', name: 'Sudan' },
  { iso2: 'RW', dialCode: '+250', name: 'Rwanda' },
  { iso2: 'ET', dialCode: '+251', name: 'Ethiopia' },
  { iso2: 'SO', dialCode: '+252', name: 'Somalia' },
  { iso2: 'DJ', dialCode: '+253', name: 'Djibouti' },
  { iso2: 'KE', dialCode: '+254', name: 'Kenya' },
  { iso2: 'TZ', dialCode: '+255', name: 'Tanzania' },
  { iso2: 'UG', dialCode: '+256', name: 'Uganda' },
  { iso2: 'BI', dialCode: '+257', name: 'Burundi' },
  { iso2: 'MZ', dialCode: '+258', name: 'Mozambique' },
  { iso2: 'ZM', dialCode: '+260', name: 'Zambia' },
  { iso2: 'MG', dialCode: '+261', name: 'Madagascar' },
  { iso2: 'TF', dialCode: '+262', name: 'French Southern and Antarctic Lands' },
  { iso2: 'YT', dialCode: '+262', name: 'Mayotte' },
  { iso2: 'RE', dialCode: '+262', name: 'Reunion' },
  { iso2: 'ZW', dialCode: '+263', name: 'Zimbabwe' },
  { iso2: 'NA', dialCode: '+264', name: 'Namibia' },
  { iso2: 'MW', dialCode: '+265', name: 'Malawi' },
  { iso2: 'LS', dialCode: '+266', name: 'Lesotho' },
  { iso2: 'BW', dialCode: '+267', name: 'Botswana' },
  { iso2: 'SZ', dialCode: '+268', name: 'Eswatini' },
  { iso2: 'UM', dialCode: '+268', name: 'United States Minor Outlying Islands' },
  { iso2: 'KM', dialCode: '+269', name: 'Comoros' },
  { iso2: 'SH', dialCode: '+290', name: 'Saint Helena, Ascension and Tristan da Cunha' },
  { iso2: 'ER', dialCode: '+291', name: 'Eritrea' },
  { iso2: 'AW', dialCode: '+297', name: 'Aruba' },
  { iso2: 'FO', dialCode: '+298', name: 'Faroe Islands' },
  { iso2: 'GL', dialCode: '+299', name: 'Greenland' },
  { iso2: 'GI', dialCode: '+350', name: 'Gibraltar' },
  { iso2: 'PT', dialCode: '+351', name: 'Portugal' },
  { iso2: 'LU', dialCode: '+352', name: 'Luxembourg' },
  { iso2: 'IE', dialCode: '+353', name: 'Ireland' },
  { iso2: 'IS', dialCode: '+354', name: 'Iceland' },
  { iso2: 'AL', dialCode: '+355', name: 'Albania' },
  { iso2: 'MT', dialCode: '+356', name: 'Malta' },
  { iso2: 'CY', dialCode: '+357', name: 'Cyprus' },
  { iso2: 'FI', dialCode: '+358', name: 'Finland' },
  { iso2: 'BG', dialCode: '+359', name: 'Bulgaria' },
  { iso2: 'LT', dialCode: '+370', name: 'Lithuania' },
  { iso2: 'LV', dialCode: '+371', name: 'Latvia' },
  { iso2: 'EE', dialCode: '+372', name: 'Estonia' },
  { iso2: 'MD', dialCode: '+373', name: 'Moldova' },
  { iso2: 'AM', dialCode: '+374', name: 'Armenia' },
  { iso2: 'BY', dialCode: '+375', name: 'Belarus' },
  { iso2: 'AD', dialCode: '+376', name: 'Andorra' },
  { iso2: 'MC', dialCode: '+377', name: 'Monaco' },
  { iso2: 'SM', dialCode: '+378', name: 'San Marino' },
  { iso2: 'UA', dialCode: '+380', name: 'Ukraine' },
  { iso2: 'RS', dialCode: '+381', name: 'Serbia' },
  { iso2: 'ME', dialCode: '+382', name: 'Montenegro' },
  { iso2: 'XK', dialCode: '+383', name: 'Kosovo' },
  { iso2: 'HR', dialCode: '+385', name: 'Croatia' },
  { iso2: 'SI', dialCode: '+386', name: 'Slovenia' },
  { iso2: 'BA', dialCode: '+387', name: 'Bosnia and Herzegovina' },
  { iso2: 'MK', dialCode: '+389', name: 'North Macedonia' },
  { iso2: 'CZ', dialCode: '+420', name: 'Czechia' },
  { iso2: 'SK', dialCode: '+421', name: 'Slovakia' },
  { iso2: 'LI', dialCode: '+423', name: 'Liechtenstein' },
  { iso2: 'FK', dialCode: '+500', name: 'Falkland Islands' },
  { iso2: 'GS', dialCode: '+500', name: 'South Georgia' },
  { iso2: 'BZ', dialCode: '+501', name: 'Belize' },
  { iso2: 'GT', dialCode: '+502', name: 'Guatemala' },
  { iso2: 'SV', dialCode: '+503', name: 'El Salvador' },
  { iso2: 'HN', dialCode: '+504', name: 'Honduras' },
  { iso2: 'NI', dialCode: '+505', name: 'Nicaragua' },
  { iso2: 'CR', dialCode: '+506', name: 'Costa Rica' },
  { iso2: 'PA', dialCode: '+507', name: 'Panama' },
  { iso2: 'PM', dialCode: '+508', name: 'Saint Pierre and Miquelon' },
  { iso2: 'HT', dialCode: '+509', name: 'Haiti' },
  { iso2: 'GP', dialCode: '+590', name: 'Guadeloupe' },
  { iso2: 'BL', dialCode: '+590', name: 'Saint Barthelemy' },
  { iso2: 'MF', dialCode: '+590', name: 'Saint Martin' },
  { iso2: 'BO', dialCode: '+591', name: 'Bolivia' },
  { iso2: 'GY', dialCode: '+592', name: 'Guyana' },
  { iso2: 'EC', dialCode: '+593', name: 'Ecuador' },
  { iso2: 'GF', dialCode: '+594', name: 'French Guiana' },
  { iso2: 'PY', dialCode: '+595', name: 'Paraguay' },
  { iso2: 'MQ', dialCode: '+596', name: 'Martinique' },
  { iso2: 'SR', dialCode: '+597', name: 'Suriname' },
  { iso2: 'UY', dialCode: '+598', name: 'Uruguay' },
  { iso2: 'BQ', dialCode: '+599', name: 'Caribbean Netherlands' },
  { iso2: 'CW', dialCode: '+599', name: 'Curacao' },
  { iso2: 'TL', dialCode: '+670', name: 'Timor-Leste' },
  { iso2: 'NF', dialCode: '+672', name: 'Norfolk Island' },
  { iso2: 'BN', dialCode: '+673', name: 'Brunei' },
  { iso2: 'NR', dialCode: '+674', name: 'Nauru' },
  { iso2: 'PG', dialCode: '+675', name: 'Papua New Guinea' },
  { iso2: 'TO', dialCode: '+676', name: 'Tonga' },
  { iso2: 'SB', dialCode: '+677', name: 'Solomon Islands' },
  { iso2: 'VU', dialCode: '+678', name: 'Vanuatu' },
  { iso2: 'FJ', dialCode: '+679', name: 'Fiji' },
  { iso2: 'PW', dialCode: '+680', name: 'Palau' },
  { iso2: 'WF', dialCode: '+681', name: 'Wallis and Futuna' },
  { iso2: 'CK', dialCode: '+682', name: 'Cook Islands' },
  { iso2: 'NU', dialCode: '+683', name: 'Niue' },
  { iso2: 'WS', dialCode: '+685', name: 'Samoa' },
  { iso2: 'KI', dialCode: '+686', name: 'Kiribati' },
  { iso2: 'NC', dialCode: '+687', name: 'New Caledonia' },
  { iso2: 'TV', dialCode: '+688', name: 'Tuvalu' },
  { iso2: 'PF', dialCode: '+689', name: 'French Polynesia' },
  { iso2: 'TK', dialCode: '+690', name: 'Tokelau' },
  { iso2: 'FM', dialCode: '+691', name: 'Micronesia' },
  { iso2: 'MH', dialCode: '+692', name: 'Marshall Islands' },
  { iso2: 'KP', dialCode: '+850', name: 'North Korea' },
  { iso2: 'HK', dialCode: '+852', name: 'Hong Kong' },
  { iso2: 'MO', dialCode: '+853', name: 'Macau' },
  { iso2: 'KH', dialCode: '+855', name: 'Cambodia' },
  { iso2: 'LA', dialCode: '+856', name: 'Laos' },
  { iso2: 'BD', dialCode: '+880', name: 'Bangladesh' },
  { iso2: 'TW', dialCode: '+886', name: 'Taiwan' },
  { iso2: 'MV', dialCode: '+960', name: 'Maldives' },
  { iso2: 'LB', dialCode: '+961', name: 'Lebanon' },
  { iso2: 'JO', dialCode: '+962', name: 'Jordan' },
  { iso2: 'SY', dialCode: '+963', name: 'Syria' },
  { iso2: 'IQ', dialCode: '+964', name: 'Iraq' },
  { iso2: 'KW', dialCode: '+965', name: 'Kuwait' },
  { iso2: 'SA', dialCode: '+966', name: 'Saudi Arabia' },
  { iso2: 'YE', dialCode: '+967', name: 'Yemen' },
  { iso2: 'OM', dialCode: '+968', name: 'Oman' },
  { iso2: 'PS', dialCode: '+970', name: 'Palestine' },
  { iso2: 'AE', dialCode: '+971', name: 'United Arab Emirates' },
  { iso2: 'IL', dialCode: '+972', name: 'Israel' },
  { iso2: 'BH', dialCode: '+973', name: 'Bahrain' },
  { iso2: 'QA', dialCode: '+974', name: 'Qatar' },
  { iso2: 'BT', dialCode: '+975', name: 'Bhutan' },
  { iso2: 'MN', dialCode: '+976', name: 'Mongolia' },
  { iso2: 'NP', dialCode: '+977', name: 'Nepal' },
  { iso2: 'TJ', dialCode: '+992', name: 'Tajikistan' },
  { iso2: 'TM', dialCode: '+993', name: 'Turkmenistan' },
  { iso2: 'AZ', dialCode: '+994', name: 'Azerbaijan' },
  { iso2: 'GE', dialCode: '+995', name: 'Georgia' },
  { iso2: 'KG', dialCode: '+996', name: 'Kyrgyzstan' },
  { iso2: 'UZ', dialCode: '+998', name: 'Uzbekistan' },
  { iso2: 'US', dialCode: '+1201', name: 'United States' },
  { iso2: 'CA', dialCode: '+1204', name: 'Canada' },
  { iso2: 'BS', dialCode: '+1242', name: 'Bahamas' },
  { iso2: 'BB', dialCode: '+1246', name: 'Barbados' },
  { iso2: 'AI', dialCode: '+1264', name: 'Anguilla' },
  { iso2: 'AG', dialCode: '+1268', name: 'Antigua and Barbuda' },
  { iso2: 'VG', dialCode: '+1284', name: 'British Virgin Islands' },
  { iso2: 'VI', dialCode: '+1340', name: 'United States Virgin Islands' },
  { iso2: 'KY', dialCode: '+1345', name: 'Cayman Islands' },
  { iso2: 'BM', dialCode: '+1441', name: 'Bermuda' },
  { iso2: 'GD', dialCode: '+1473', name: 'Grenada' },
  { iso2: 'TC', dialCode: '+1649', name: 'Turks and Caicos Islands' },
  { iso2: 'MS', dialCode: '+1664', name: 'Montserrat' },
  { iso2: 'MP', dialCode: '+1670', name: 'Northern Mariana Islands' },
  { iso2: 'GU', dialCode: '+1671', name: 'Guam' },
  { iso2: 'AS', dialCode: '+1684', name: 'American Samoa' },
  { iso2: 'SX', dialCode: '+1721', name: 'Sint Maarten' },
  { iso2: 'LC', dialCode: '+1758', name: 'Saint Lucia' },
  { iso2: 'DM', dialCode: '+1767', name: 'Dominica' },
  { iso2: 'VC', dialCode: '+1784', name: 'Saint Vincent and the Grenadines' },
  { iso2: 'PR', dialCode: '+1787', name: 'Puerto Rico' },
  { iso2: 'DO', dialCode: '+1809', name: 'Dominican Republic' },
  { iso2: 'TT', dialCode: '+1868', name: 'Trinidad and Tobago' },
  { iso2: 'KN', dialCode: '+1869', name: 'Saint Kitts and Nevis' },
  { iso2: 'JM', dialCode: '+1876', name: 'Jamaica' },
  { iso2: 'SJ', dialCode: '+4779', name: 'Svalbard and Jan Mayen' },
  { iso2: 'AX', dialCode: '+35818', name: 'Aland Islands' },
  { iso2: 'EH', dialCode: '+2125288', name: 'Western Sahara' },
  { iso2: 'VA', dialCode: '+3906698', name: 'Vatican City' },
]

const NON_USER_FACING_ISO2 = new Set([
  'AQ', 'AX', 'BL', 'BM', 'BQ', 'BV', 'CC', 'CK', 'CP', 'CW', 'CX', 'EH', 'FK', 'FO',
  'GF', 'GG', 'GI', 'GL', 'GP', 'GS', 'GU', 'HK', 'HM', 'IM', 'IO', 'JE', 'KY', 'MF',
  'MO', 'MP', 'MQ', 'MS', 'NC', 'NF', 'NU', 'PF', 'PM', 'PN', 'PR', 'RE', 'SH', 'SJ',
  'TC', 'TF', 'TK', 'UM', 'VG', 'VI', 'WF', 'YT'
])

function normalizeDialCode (rawDialCode: string): string {
  if (/^\+1\d{3,}$/.test(rawDialCode)) return '+1'
  if (/^\+7\d+$/.test(rawDialCode)) return '+7'
  if (/^\+39\d{3,}$/.test(rawDialCode)) return '+39'
  if (/^\+358\d+$/.test(rawDialCode)) return '+358'
  if (/^\+47\d+$/.test(rawDialCode)) return '+47'
  if (/^\+212\d+$/.test(rawDialCode)) return '+212'
  return rawDialCode
}

const COUNTRY_DIAL_OPTIONS_USER = COUNTRY_DIAL_OPTIONS
  .filter((option) => !NON_USER_FACING_ISO2.has(option.iso2))
  .map((option) => ({ ...option, dialCode: normalizeDialCode(option.dialCode) }))
  .filter((option, index, source) => {
    const key = `${option.iso2}|${option.dialCode}`
    return source.findIndex((candidate) => `${candidate.iso2}|${candidate.dialCode}` === key) === index
  })

export const COUNTRY_DIAL_OPTIONS_ASC = [...COUNTRY_DIAL_OPTIONS_USER].sort((a, b) => {
  const codeA = Number.parseInt(a.dialCode.replace('+', ''), 10)
  const codeB = Number.parseInt(b.dialCode.replace('+', ''), 10)
  if (codeA !== codeB) return codeA - codeB
  return a.name.localeCompare(b.name)
})

const PREFERRED_ISO_BY_DIAL_CODE: Record<string, string> = {
  '+1': 'US',
  '+7': 'RU'
}

export const COUNTRY_PREFIX_OPTIONS = Array.from(
  COUNTRY_DIAL_OPTIONS_ASC.reduce((map, option) => {
    const current = map.get(option.dialCode)
    if (!current) {
      map.set(option.dialCode, option)
      return map
    }

    const preferredIso = PREFERRED_ISO_BY_DIAL_CODE[option.dialCode]
    if (preferredIso && option.iso2 === preferredIso) {
      map.set(option.dialCode, option)
    }

    return map
  }, new Map<string, CountryDialOption>()).values()
)

const DIAL_CODES_DESC = Array.from(new Set(COUNTRY_DIAL_OPTIONS.map((option) => option.dialCode))).sort(
  (a, b) => b.length - a.length
)

export function countryCodeToFlag (iso2: string): string {
  const normalized = iso2.toUpperCase()
  if (!/^[A-Z]{2}$/.test(normalized)) return ''
  const codePoints = [...normalized].map((char) => 127397 + char.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}

export function splitPhoneValue (raw: string) {
  const value = raw.trim()
  if (!value) return { dialCode: DEFAULT_DIAL_CODE, localNumber: '' }
  if (!value.startsWith('+')) return { dialCode: DEFAULT_DIAL_CODE, localNumber: value }

  const matchedDialCode = DIAL_CODES_DESC.find((dialCode) => value.startsWith(dialCode))
  if (!matchedDialCode) {
    return { dialCode: DEFAULT_DIAL_CODE, localNumber: value }
  }

  const normalizedDialCode = normalizeDialCode(matchedDialCode)
  const localNumber = value.slice(matchedDialCode.length)
  const fallbackLocalNumber = value.slice(normalizedDialCode.length)

  return {
    dialCode: COUNTRY_PREFIX_OPTIONS.some((option) => option.dialCode === normalizedDialCode)
      ? normalizedDialCode
      : DEFAULT_DIAL_CODE,
    localNumber: matchedDialCode.length > normalizedDialCode.length ? fallbackLocalNumber : localNumber
  }
}

export function combinePhoneValue (dialCode: string, localNumber: string): string {
  const trimmed = localNumber.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('+')) return trimmed
  return dialCode ? `${dialCode}${trimmed}` : trimmed
}
