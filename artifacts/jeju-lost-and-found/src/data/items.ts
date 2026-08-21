export type ItemCategory = '교복' | '전자기기' | '문구류' | '생활용품' | '기타';
export type ItemStatus = '보관 중' | '수령 완료';

export interface LostItem {
  id: string;
  name: string;
  category: ItemCategory;
  foundDate: string;
  foundLocation: string;
  image: string;
  status: ItemStatus;
  description: string;
  claimInstructions: string[];
}

const illustration = (background: string, foreground: string, detail: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><rect width="800" height="600" fill="${background}"/><circle cx="680" cy="92" r="118" fill="#ffffff" opacity=".22"/><circle cx="120" cy="540" r="168" fill="#ffffff" opacity=".12"/><path d="M0 458C170 385 266 498 420 442s244-60 380-3v161H0z" fill="#ffffff" opacity=".12"/>${detail}<rect x="94" y="76" width="612" height="448" rx="36" fill="none" stroke="#ffffff" stroke-opacity=".18" stroke-width="3"/></svg>`)}`;

export const lostItems: LostItem[] = [
  {
    id: 'uniform-01',
    name: '네이비 교복 재킷',
    category: '교복',
    foundDate: '2024. 05. 21.',
    foundLocation: '본관 2층 복도',
    image: illustration('#1b6ca8', '#102b50', '<path d="M290 178l-84 74 54 60 29-28v159h222V284l29 28 54-60-84-74-75 50z" fill="#102b50"/><path d="M370 228l40 52 40-52" fill="none" stroke="#dfeaf3" stroke-width="9"/><path d="M403 279h14v164h-14z" fill="#dfeaf3" opacity=".6"/>'),
    status: '보관 중',
    description: '왼쪽 가슴에 학교 로고가 있는 네이비색 교복 재킷입니다. 안쪽 이름표는 확인하지 못했습니다.',
    claimInstructions: ['학생증 또는 본인 확인이 가능한 정보를 준비해 주세요.', '행정실에서 보관 중인 물품을 확인해 주세요.', '본인 물품이 맞다면 담당 선생님 확인 후 수령할 수 있습니다.'],
  },
  {
    id: 'earbuds-02',
    name: '흰색 무선 이어폰 케이스',
    category: '전자기기',
    foundDate: '2024. 05. 20.',
    foundLocation: '도서관 열람실 B',
    image: illustration('#d8e9f5', '#ffffff', '<rect x="290" y="146" width="220" height="310" rx="86" fill="#ffffff"/><path d="M319 285h162v92c0 27-22 49-49 49h-64c-27 0-49-22-49-49z" fill="#e9f2f7"/><path d="M348 255c0-50 22-78 52-78s52 28 52 78" fill="none" stroke="#bfd6e5" stroke-width="13"/><circle cx="400" cy="326" r="10" fill="#7bb4d5"/>'),
    status: '보관 중',
    description: '작은 스크래치가 있는 흰색 무선 이어폰 충전 케이스입니다. 이어폰 본체는 없습니다.',
    claimInstructions: ['케이스 안쪽에 표시된 기기 정보로 본인 여부를 확인합니다.', '도서관 안내 데스크에 방문해 문의해 주세요.', '기기 연결 기록이나 케이스 특징을 알려주시면 도움이 됩니다.'],
  },
  {
    id: 'pouch-03',
    name: '연두색 필통',
    category: '문구류',
    foundDate: '2024. 05. 18.',
    foundLocation: '급식실 앞 벤치',
    image: illustration('#e8f2de', '#8dbb69', '<rect x="204" y="220" width="392" height="170" rx="78" fill="#8dbb69" transform="rotate(-8 400 305)"/><path d="M241 261h317" stroke="#e9f5dc" stroke-width="9" stroke-linecap="round" opacity=".75"/><circle cx="293" cy="325" r="18" fill="#f7ca61"/><rect x="338" y="300" width="95" height="34" rx="17" fill="#f4f0d6"/><path d="M502 275l45 50" stroke="#f6d97f" stroke-width="14" stroke-linecap="round"/>'),
    status: '보관 중',
    description: '연두색 천 소재 필통으로 검정색 유성펜과 샤프가 들어 있습니다.',
    claimInstructions: ['필통 안에 들어 있는 문구류를 설명해 주세요.', '급식실 운영 시간에는 안내 선생님께 문의해 주세요.', '분실물 확인 후 이름을 적어 수령합니다.'],
  },
  {
    id: 'umbrella-04',
    name: '투명 장우산',
    category: '생활용품',
    foundDate: '2024. 05. 17.',
    foundLocation: '후문 우산 보관대',
    image: illustration('#cfe7ef', '#f9fcfb', '<path d="M180 296c0-126 98-193 220-193s220 67 220 193c-69-43-130-43-220 0-90-43-151-43-220 0z" fill="#f9fcfb" fill-opacity=".8" stroke="#79aabd" stroke-width="8"/><path d="M400 104v324c0 54 28 72 60 72 29 0 49-19 49-43" fill="none" stroke="#79aabd" stroke-width="8" stroke-linecap="round"/><path d="M400 104L280 292M400 104l120 188" stroke="#79aabd" stroke-width="4" opacity=".65"/>'),
    status: '보관 중',
    description: '손잡이 끝에 작은 파란색 끈이 달린 투명 장우산입니다.',
    claimInstructions: ['우산 손잡이의 끈 색상과 특징을 알려 주세요.', '행정실 앞 분실물 보관함에서 확인할 수 있습니다.', '우천 시에는 다른 학생의 물품과 섞이지 않도록 빠르게 찾아가 주세요.'],
  },
  {
    id: 'card-05',
    name: '검정색 카드지갑',
    category: '기타',
    foundDate: '2024. 05. 15.',
    foundLocation: '운동장 스탠드',
    image: illustration('#dce8f4', '#263c55', '<rect x="246" y="191" width="309" height="218" rx="25" fill="#263c55" transform="rotate(6 400 300)"/><path d="M274 245h254v53H274z" fill="#516a82" opacity=".62" transform="rotate(6 400 300)"/><circle cx="471" cy="350" r="13" fill="#f4ca64"/><path d="M315 358h91" stroke="#a9c2d5" stroke-width="8" stroke-linecap="round" transform="rotate(6 400 300)"/>'),
    status: '수령 완료',
    description: '앞면에 얇은 금속선이 있는 검정색 카드지갑입니다.',
    claimInstructions: ['현재 수령 완료된 물품입니다.', '비슷한 물품을 찾고 있다면 다른 등록 물품도 확인해 주세요.'],
  },
  {
    id: 'charger-06',
    name: '노트북 충전기',
    category: '전자기기',
    foundDate: '2024. 05. 14.',
    foundLocation: '자율학습실 3번 자리',
    image: illustration('#e3edf7', '#346a97', '<rect x="285" y="197" width="230" height="150" rx="24" fill="#346a97"/><path d="M340 347v72c0 39 32 70 70 70h14" fill="none" stroke="#346a97" stroke-width="20" stroke-linecap="round"/><path d="M424 489h83c28 0 50-22 50-50v-27" fill="none" stroke="#346a97" stroke-width="20" stroke-linecap="round"/><path d="M333 252h134" stroke="#b9d6e8" stroke-width="10" stroke-linecap="round"/><circle cx="479" cy="253" r="12" fill="#f4ca64"/>'),
    status: '보관 중',
    description: '검정색 본체와 둥근 케이블이 연결된 노트북 충전기입니다.',
    claimInstructions: ['충전기와 함께 사용하는 노트북 모델을 알려 주세요.', '자율학습실 담당 선생님 또는 행정실에 문의해 주세요.', '안전을 위해 전원 연결 전 본인 물품인지 확인합니다.'],
  },
  {
    id: 'book-07',
    name: '영어 독해 문제집',
    category: '문구류',
    foundDate: '2024. 05. 12.',
    foundLocation: '본관 1층 계단',
    image: illustration('#f1e9d9', '#3d6589', '<rect x="267" y="158" width="230" height="298" rx="8" fill="#3d6589" transform="rotate(-7 400 300)"/><rect x="295" y="191" width="174" height="216" fill="#d8e7ef" transform="rotate(-7 400 300)"/><path d="M323 252h122M323 282h101M323 312h123" stroke="#6a8aa3" stroke-width="10" stroke-linecap="round" transform="rotate(-7 400 300)"/><circle cx="397" cy="356" r="24" fill="#f3c967" opacity=".9"/>'),
    status: '수령 완료',
    description: '표지 안쪽에 이름을 쓸 수 있는 칸이 있는 영어 독해 문제집입니다.',
    claimInstructions: ['현재 수령 완료된 물품입니다.', '학교 도서관에서 유사한 문제집을 확인할 수 있습니다.'],
  },
];