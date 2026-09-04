export type ItemCategory = "교복" | "전자기기" | "문구류" | "생활용품" | "기타";
export type ItemStatus = "보관 중" | "수령 완료";

export interface LostItem {
  id: string;
  itemName: string;
  category: ItemCategory;
  description: string;
  foundDate: string;
  foundLocation: string;
  imageUrl: string | null;
  status: ItemStatus;
  createdAt: string;
}