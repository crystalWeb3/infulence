// utils/getCountryGroup.ts

const brics = new Set([
  "Brazil",
  "Russia",
  "India",
  "China",
  "South Africa",
  "Iran",
  "Egypt",
  "Ethiopia",
  "Argentina",
  "Saudi Arabia",
  "UAE"
]);

const nato = new Set([
  "United States",
  "Canada",
  "United Kingdom",
  "Germany",
  "France",
  "Italy",
  "Spain",
  "Netherlands",
  "Belgium",
  "Turkey",
  "Greece",
  "Poland",
  "Norway",
  "Denmark",
  "Portugal",
  "Czech Republic",
  "Hungary",
  "Romania",
  "Slovakia",
  "Bulgaria",
  "Croatia",
  "Slovenia",
  "Albania",
  "Estonia",
  "Latvia",
  "Lithuania",
  "Montenegro",
  "North Macedonia",
  "Luxembourg",
  "Iceland"
]);


const CONTINENTS: Record<string, string[]> = {
  Asia: [
    "China", "India", "Japan", "Korea; Republic of", "Indonesia", "Pakistan", "Bangladesh", "Viet nam",
    "Philippines", "Thailand", "Malaysia", "Singapore", "Saudi Arabia", "Iran", "Taiwan", "Hong Kong",
    "Korea; Dem. People's Republic", "Myanmar", "Sri Lanka", "Nepal", "Afghanistan",

    "Timo Leste", "Cambodia", "Laos", "Mongolia", "Brunei Darussalam", "Bhutan", "Kazakhstan",
    "Uzbekistan", "Turkmenistan", "Kyrgyzstan", "Tajikistan", "Azerbaijan",


  ],
  MiddleEast : [
    "Iran", "Iraq", "Syria", "Turkey", "Saudi Arabia", "United Arab Emirates", "Qatar", "Kuwait",
    "Oman", "Bahrain", "Yemen", "Jordan", "Lebanon", "Israel", "Palestine", "Egypt",    
  ],
  Europe: [
    "Russian Federation", "Ukraine", "Poland", "Czech Republic", "Hungary", "Romania",
    "United Kingdom", "Germany", "France", "Italy", "Spain", "Poland", "Netherlands", "Belgium",
    "Ukraine", "Sweden", "Norway", "Denmark", "Finland", "Switzerland", "Austria", "Ireland",
    "Portugal", "Czech Republic", "Hungary", "Romania", "Slovakia", "Bulgaria", "Greece", "Serbia",
    "Croatia", "Slovenia", "Bosnia and Herzegovina", "Montenegro", "North Macedonia", "Albania",
    "Estonia", "Latvia", "Lithuania", "Iceland", "Luxembourg", "Malta", "Andorra", "Monaco",
    "Liechtenstein", "San Marino", "Vatican City", "Kosovo", "Moldova", "Belarus", "Armenia",  "Georgia"
  ],
  Africa: [
    "South Africa", "Nigeria", "Egypt", "Ethiopia", "Kenya", "Ghana", "Morocco", "Algeria",
    "Tunisia", "Tanzania", "Angola", "Mozambique", "Zambia", "Uganda", "Sudan", "Rwanda",
    "Cote D'Ivoire", "Cameroon", "Senegal", "Mali", "Zimbabwe", "Namibia", "Botswana", "Sierra Leone",
    "Liberia", "Gambia", "Mauritania", "Burkina Faso", "Togo", "Benin", "Chad", "Central African Republic",
    "Democratic Congo", "Congo; Dem. Republic of the", "Sudan South", "Eritrea", "Djibouti",
    "Somalia", "Cape Verde", "Sao Tome and Principe", "Comoros", "Madagascar", "Mauritius",
    "Seychelles", "Eswatini", "Lesotho", "Malawi", "Burundi", "Guinea", "Guinea Bissau", "Equatorial Guinea",
    "Sao Tome and Principe", "Tanzania", "Zambia", "Zimbabwe", "Angola", "Namibia", "Botswana",
    "Trinidad and Tobago", "Seychelles", "Mauritius", "Madagascar", "Comoros", "Reunion", "Cabo Verde",
    "St. Lucia", "Sahrawi Arab Dem Rep"

  ],
  NorthAmerica: [
    "United States of America", "Canada", "Mexico", "Cuba", "Guatemala", "Honduras", "Panama", "Jamaica"
  ],
  SouthAmerica: [
    "Brazil", "Argentina", "Colombia", "Chile", "Peru", "Venezuela; Bolivarian Republic", "Ecuador", "Bolivia",
    "Paraguay", "Uruguay", "Guyana", "Suriname", "French Guiana",
    "Falkland Islands", "Puerto Rico"
  ],
  Oceania: [
    "Australia", "New Zealand", "Papua New Guinea", "Fiji", "Samoa", "Micronesia", "Solomon Islands",
  ]
};

export function getCountryGroup(name: string): string {
  if (brics.has(name)) return "BRICS";
  else if(nato.has(name)) return "NATO";  
  return "Other";
}

export function getContinentByCountry(country: string): string {
  for (const continent in CONTINENTS) {
    if (CONTINENTS[continent].includes(country)) {
      return continent;
    }
  }
  return "Other";
 
}


export function getContinentCountries(continent: string): string[] {
  return CONTINENTS[continent] || [];
}