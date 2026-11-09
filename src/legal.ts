// Privacy Policy and Terms for the site, shared by tabs and pages; bump LEGAL_VERSION on change.
export const LEGAL_VERSION = '2026-11-09.6';
export const LEGAL_UPDATED = '9 November 2026';
export const LEGAL_DEVELOPER = 'Martin Byalov';
export const LEGAL_CONTACT = 'contact@stonktrooper.lol';
export const LEGAL_ADDRESS = 'Sofia, Bulgaria';
export const LEGAL_GOVERNING_LAW = 'Bulgaria';

export interface LegalSection { heading: string; paragraphs: (string | string[])[] }
export interface LegalDocument { title: string; intro: string; sections: LegalSection[] }

const C = LEGAL_CONTACT;

export const PRIVACY_POLICY: LegalDocument = {
  title: 'Privacy Policy',
  intro: `This privacy policy applies to the Stonktrooper website and the related services operated by ${LEGAL_DEVELOPER} (collectively, the "Service"). ${LEGAL_DEVELOPER} is referred to as the "Service Provider". You can play as a Guest without an account. Signing in with Google is optional and is used to keep your game save in your own Google Drive and to take part in Monthly Squeeze.`,
  sections: [
    { heading: 'Data Controller', paragraphs: [
      `${LEGAL_DEVELOPER} acts as the Data Controller for the processing described in this policy.`,
      [`Name: ${LEGAL_DEVELOPER}`, `Address: ${LEGAL_ADDRESS}`, `Email: ${C}`],
      'For data protection inquiries and to exercise your GDPR rights, contact the Data Controller using the details above. Google, Cloudflare and GitHub act under their own terms and privacy policies for the services they provide to the Service.',
    ] },
    { heading: 'What information does the Service use?', paragraphs: [
      'As a Guest you do not give the Service Provider any personal information. Your settings and Guest play stay in your browser.',
      'If you sign in with Google, the Service receives only your Google account identifier. It does not ask for or receive your name, email address or profile picture. You are asked to allow access to the hidden app data folder of your Google Drive (the "drive.appdata" permission). The Service cannot see, read or change any other file in your Drive.',
      'Your game save is a small file in that app data folder, in your own Google Drive. It contains your game progress: your balances, the cosmetic items you own and have equipped, your statistics, quests and achievements and, for Monthly Squeeze, your monthly progress. It is created automatically the first time you sign in, and the game reads and updates it as you play.',
      'Monthly Squeeze counts the liquidations you make in the current month. When you reach the personal threshold, the Service records once, for that event, that your account took part, and the time. Everyone sees only the total number of players who took part.',
      'The Service Provider does not send you marketing communications.',
    ] },
    { heading: 'What the Service keeps on its servers', paragraphs: [
      'The Service runs on Cloudflare Workers. It keeps only what it needs to run sign-in, your game save and Monthly Squeeze:',
      [
        'A session record, so you stay signed in. Your Google account identifier and the Google permission token needed to reach your Drive app data folder are stored encrypted. The session lasts up to 30 days or until you sign out.',
        'Short-lived sign-in records (about 10 minutes) and request counters that limit abuse.',
        'Technical records of your Monthly Squeeze progress updates: a one-way hash of your account, operation identifiers and content hashes. They are used to prevent lost or duplicated updates.',
        'For Monthly Squeeze: the event, a one-way hash of your account and the time you took part.',
      ],
      'The Service does not store your game save on its own servers: it is kept in your Google Drive and only passes through the Service when the game reads or updates it.',
    ] },
    { heading: 'What information is collected automatically?', paragraphs: [
      'GitHub (which hosts the website), Cloudflare (which runs the account service) and Google (sign-in and Drive) process technical data such as your IP address and browser information when your browser contacts them, for security and to deliver their services. The Service does not use advertising, analytics or tracking tools.',
      'The Service does not collect precise location information and does not use Artificial Intelligence (AI) technologies to process your data.',
    ] },
    { heading: 'Cookies and similar technologies', paragraphs: [
      'The Service uses only strictly necessary cookies, and only if you sign in: a session cookie (HttpOnly, Secure, SameSite=Lax) that keeps you signed in for up to 30 days or until you sign out, and a short sign-in cookie that lasts about 10 minutes. There are no advertising or tracking cookies.',
      'Your browser also stores on your device: your settings (theme, sound, volume, music style, Shmuck Feed, high contrast and animations), a copy of the latest Monthly Squeeze total, and a note that you already claimed a Monthly Squeeze reward. This data is not used to identify you.',
    ] },
    { heading: 'Legal basis for processing', paragraphs: [
      'Where the GDPR applies, the following lawful bases are relied on:',
      [
        'Contract performance: providing the game, signing you in, keeping your game save and running Monthly Squeeze.',
        'Consent: your permission on the Google consent screen to reach your Drive app data folder. You may withdraw it at any time.',
        'Legitimate interests: keeping the Service working and secure and preventing fraud and abuse, where these interests are not overridden by your rights.',
        'Legal obligation: complying with laws or government requests.',
      ],
    ] },
    { heading: 'Automated decision-making and profiling', paragraphs: [
      'The Service Provider does not make automated decisions that produce legal or similarly significant effects for you. Whether a shared Monthly Squeeze reward unlocks is decided automatically by the total number of players who took part, and it applies equally to everyone.',
    ] },
    { heading: 'Third parties and international transfers', paragraphs: [
      'Information is shared with Google (sign-in and Drive), Cloudflare (account service) and GitHub (website hosting). These providers may process data outside the European Economic Area (EEA). Where such transfers occur, they rely on mechanisms required by GDPR Chapter V, such as adequacy decisions of the European Commission or Standard Contractual Clauses. They have their own privacy policies:',
      ['[Google Privacy Policy](https://policies.google.com/privacy)', '[Cloudflare Privacy Policy](https://www.cloudflare.com/privacypolicy/)', '[GitHub General Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement)'],
      'The Service Provider may also disclose information in the following cases.',
      ['It may disclose information as required by law, such as to comply with a subpoena or similar legal process.', 'It may disclose information when disclosure is necessary in good faith to protect rights or safety, investigate fraud, or respond to a government request.'],
    ] },
    { heading: 'Data retention and deletion', paragraphs: [
      [
        'Settings and caches in your browser stay until you clear your site data.',
        'Signing out ends your session and removes it from the Service. Otherwise it expires after 30 days.',
        'Your game save stays in your Google Drive until you delete it. In your Google Account, open Data & privacy, then Third-party apps and services, choose Stonktrooper, and either delete its hidden app data or remove its access.',
        'Technical records and Monthly Squeeze participation are kept while the Service runs and are deleted when you ask.',
      ],
      `If you need help deleting your data or exercising any right, contact the Service Provider at ${C}. Requests are answered within one month, extendable by up to two months where necessary, as permitted by law.`,
    ] },
    { heading: 'Children', paragraphs: [
      'The Service is not intended for children under 16 years of age, or under a higher age of digital consent established by applicable law, without the consent of a parent or guardian. The Service Provider does not knowingly collect personal information from children and does not market the Service to them.',
      `If you are a parent or guardian and believe your child has provided personal information, contact the Service Provider at ${C} so that the necessary actions can be taken.`,
    ] },
    { heading: 'Security', paragraphs: [
      'Your game save is held in your own Google Drive, and the Service keeps your Google permission token only in encrypted form. The sign-in cookie cannot be read by scripts on the page. Keep your Google account secure. No security system can prevent all potential breaches.',
      'In the event of a personal data breach that poses a risk to your rights and freedoms, the Service Provider will notify the relevant supervisory authority within 72 hours of becoming aware of it and, where the risk is high, will inform you without undue delay.',
    ] },
    { heading: 'Your GDPR rights', paragraphs: [
      'Under the GDPR, you have the following rights:',
      [
        'Right of access to your personal data.',
        'Right to rectification of inaccurate data.',
        'Right to erasure ("right to be forgotten").',
        'Right to restrict processing.',
        'Right to data portability.',
        'Right to object to processing based on legitimate interests.',
        'Right to withdraw consent at any time, in your Google Account settings or by contacting the Data Controller.',
        'Rights regarding automated decision-making.',
      ],
      'If you believe your data protection rights have been violated, you can lodge a complaint with your local Data Protection Authority. In Bulgaria this is the [Commission for Personal Data Protection](https://www.cpdp.bg/en/). Contact details for other countries are listed at [edpb.europa.eu](https://edpb.ec.europa.eu/about-edpb/members_en). In the United Kingdom, contact the [Information Commissioner\'s Office](https://ico.org.uk).',
    ] },
    { heading: 'Your California privacy rights (CCPA/CPRA)', paragraphs: [
      'If you are a resident of California, you have the right to know, delete and correct personal information, and not to be discriminated against for exercising these rights. The Service Provider does not sell or share personal information for advertising.',
      `To exercise these rights, contact the Service Provider at ${C}. You may designate an authorised agent to make a request on your behalf.`,
    ] },
    { heading: 'Changes to this Privacy Policy', paragraphs: [
      'The Service Provider may update this Privacy Policy. Material changes are published on stonktrooper.lol with a new effective date. Previous versions are available on request.',
      'This privacy policy is effective as of 9 November 2026.',
    ] },
    { heading: 'Contact', paragraphs: [
      `If you have any questions about privacy while using the Service, contact the Service Provider at ${C}.`,
    ] },
  ],
};

export const TERMS: LegalDocument = {
  title: 'Terms & Conditions',
  intro: `These terms and conditions apply to the Stonktrooper website and the related services operated by ${LEGAL_DEVELOPER} (collectively, the "Service"). ${LEGAL_DEVELOPER} is referred to as the "Service Provider". By using the Service, you agree to these Terms and Conditions. Please read them carefully before using the Service.`,
  sections: [
    { heading: 'Who can use the Service', paragraphs: [
      'By using the Service you confirm that you are legally permitted to use it in your country. You must be at least 16 years of age, or the age of digital consent in your country. If you are younger, a parent or legal guardian must review and accept these Terms on your behalf.',
    ] },
    { heading: 'Licence to use the Service', paragraphs: [
      'Subject to these Terms, the Service Provider grants you a limited, non-exclusive, non-transferable, revocable licence to use the Service for your personal, non-commercial entertainment. You may not reproduce, distribute, modify, create derivative works from, reverse engineer, decompile or disassemble the Service, except to the extent such activity is expressly permitted by applicable law.',
    ] },
    { heading: 'Intellectual property', paragraphs: [
      'The Service Provider retains all intellectual property rights in the Service, including its code, design, characters, artwork, music, names, logos and branding. Nothing in these Terms grants you a right to use them for any other purpose. You agree not to remove, alter or obscure any copyright, trademark or other proprietary notices in the Service.',
    ] },
    { heading: 'Entertainment only', paragraphs: [
      'Prices, charts, headlines, characters and events in the Service are fictional. Nothing in the Service is investment, financial or trading advice. The Service is not a brokerage, a trading platform or a real-money gambling service.',
    ] },
    { heading: 'Items and rewards', paragraphs: [
      'Cosmetic items, scores and other in-game rewards have no monetary value. They cannot be sold, transferred or exchanged for money or anything of value, and they may be changed, rebalanced or reset as the Service evolves. The Service has no purchases and no advertising. If paid features are ever introduced, any charges will be clearly communicated to you before you pay.',
      'Monthly Squeeze is a shared goal. Its reward unlocks for everyone only when the required number of players have taken part, and you claim it once for the event. It is not guaranteed that a goal will be reached.',
    ] },
    { heading: 'Your Google account', paragraphs: [
      'Signing in is optional. It uses Google sign-in and stores your game save in the hidden app data folder of your own Google Drive, so it depends on Google services being available and on your Google account staying active. You can stop at any time by signing out or by removing the Service\'s access in your Google Account settings. The Service Provider is not responsible for changes or outages of Google services.',
      ['[Google Terms of Service](https://policies.google.com/terms)'],
    ] },
    { heading: 'Fair play', paragraphs: [
      'Do not cheat, exploit bugs, use automation, modify the Service or your saved data, or manipulate scores or Monthly Squeeze. Progress or rewards obtained this way may be removed, and your access may be restricted.',
    ] },
    { heading: 'Your device and connection', paragraphs: [
      'Some functions of the Service, such as signing in and Monthly Squeeze, require an active internet connection. The Service Provider is not responsible if the Service does not work fully because you have no connection or have exhausted your data allowance. Charges of your network provider may apply.',
    ] },
    { heading: 'Updates and availability', paragraphs: [
      'The Service Provider may update, change or stop providing the Service or any of its features at any time. The Service Provider does not guarantee that the Service will always be compatible with your browser or device. If you find a bug, it may be a feature, but please report it anyway.',
    ] },
    { heading: 'Termination', paragraphs: [
      'You can stop using the Service at any time. The Service Provider may suspend or end your access if you materially breach these Terms, violate applicable law, infringe intellectual property rights, or harm other players or the Service Provider. When access ends, your rights under these Terms end and you must stop using the Service.',
    ] },
    { heading: 'Limitation of liability', paragraphs: [
      'The Service is provided "as is" and "as available". To the fullest extent permitted by law, the Service Provider is not liable for any indirect, incidental, special, consequential or punitive damages, including loss of data, progress or items, even if advised of the possibility of such damages. As the Service is provided free of charge, the Service Provider\'s total liability is limited to the minimum amount permitted by applicable law.',
      'The Service Provider remains liable in the following cases.',
      ['The Service Provider remains liable for death or personal injury caused by negligence.', 'The Service Provider remains liable for fraud or fraudulent misrepresentation.', 'The Service Provider remains liable for any other liability that cannot be excluded or limited under applicable law.'],
      'Nothing in these Terms limits any rights you have under consumer protection laws that cannot be lawfully excluded.',
    ] },
    { heading: 'Indemnification', paragraphs: [
      'To the fullest extent permitted by law, you agree to indemnify the Service Provider against claims, damages and expenses, including reasonable legal fees, arising from your breach of these Terms or your intentional misuse of the Service. This does not apply to claims arising from the Service Provider\'s own negligence, breach of these Terms or violation of law, and is limited where consumer law restricts it.',
    ] },
    { heading: 'Governing law', paragraphs: [
      `These Terms are governed by the laws of ${LEGAL_GOVERNING_LAW}, excluding its conflict of law rules, except where mandatory consumer protection laws of your country of residence provide otherwise. Disputes will be brought before the courts that have jurisdiction under applicable law. Nothing in this clause limits your right to bring a claim in a court competent under mandatory law.`,
    ] },
    { heading: 'Severability and entire agreement', paragraphs: [
      'If any provision of these Terms is held invalid or unenforceable, it will be modified to the minimum extent necessary, and the remaining provisions remain in effect. These Terms, together with the Privacy Policy, are the entire agreement between you and the Service Provider about the Service.',
    ] },
    { heading: 'Changes to these Terms', paragraphs: [
      'The Service Provider may update these Terms. Changes are published on stonktrooper.lol with a new effective date. Previous versions are available on request.',
      'These terms and conditions are effective as of 9 November 2026.',
    ] },
    { heading: 'Contact', paragraphs: [
      `If you have any questions or suggestions about these Terms, contact the Service Provider at ${C}.`,
    ] },
  ],
};
