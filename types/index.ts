import { User as FirebaseUser } from 'firebase/auth';

export interface Client {
  id?: string;
  name: string;
  address: string;
  phone: string;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type MilkType = 'cow' | 'buffalo';

export interface Price {
  id?: string;
  amount: number;
  milkType: MilkType;
  startDate: Date;
  endDate?: Date;
  createdAt?: Date;
}

export interface Delivery {
  id?: string;
  clientId: string;
  milkType: MilkType;
  date: Date;
  quantity: number;
  priceAtDelivery: number;
  totalAmount: number;
  createdAt?: Date;
}

export type User = FirebaseUser;

