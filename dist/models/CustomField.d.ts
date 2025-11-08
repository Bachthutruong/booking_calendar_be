import mongoose, { Document } from 'mongoose';
export type FieldType = 'text' | 'textarea' | 'email' | 'phone' | 'select' | 'checkbox' | 'radio' | 'date' | 'number';
export interface IFieldOption {
    label: string;
    value: string;
}
export interface ICustomField extends Document {
    name: string;
    label: string;
    type: FieldType;
    required: boolean;
    placeholder?: string;
    options?: IFieldOption[];
    validation?: {
        minLength?: number;
        maxLength?: number;
        pattern?: string;
        min?: number;
        max?: number;
    };
    order: number;
    isActive: boolean;
    isDefault: boolean;
    showInTable?: boolean;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<ICustomField, {}, {}, {}, mongoose.Document<unknown, {}, ICustomField, {}, {}> & ICustomField & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=CustomField.d.ts.map