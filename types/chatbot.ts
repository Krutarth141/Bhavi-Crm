import { Lang } from '@/types/bookingPortal';

export type ChatStepType = 'text' | 'choice';

export interface ChatOption {
    label: string;
    value: string;
}

export interface ChatStep {
    key: string;
    type: ChatStepType;
    prompt: string;
    optional?: boolean;
    options?: ChatOption[];
    dynamicOptions?: 'YN';
    branch?: (value: string, answers: Record<string, string>, lang: Lang) => ChatStep[];
}

export interface ChatFlowResult {
    message: string;
    chips: { label: string; action: ChatAction }[];
}

export interface ChatFlowDef {
    steps: ChatStep[] | ((ctx: Record<string, any>, lang: Lang) => ChatStep[]);
    complete: (answers: Record<string, string>, ctx: Record<string, any>, lang: Lang) => ChatFlowResult | Promise<ChatFlowResult>;
}

export type ChatAction =
    | { type: 'menu'; id: string; ctx?: Record<string, any> }
    | { type: 'flow'; id: string; ctx?: Record<string, any> }
    | { type: 'info'; key: string }
    | { type: 'dynIssueMenu'; deviceId: string }
    | { type: 'dynCctvServiceMenu'; property: string }
    | { type: 'confirmServiceTicket'; a: Record<string, string>; ctx: Record<string, any> };

export interface MenuOption {
    label: string;
    action: ChatAction;
}

export interface MenuDef {
    titleKey: string;
    options: MenuOption[];
}

export interface DeviceDef {
    id: string;
    label: string;
    issues: string[];
    serviceModeApplicable?: boolean;
}

export interface KBEntry {
    kw: string[];
    a: Record<Lang, string>;
}

export interface ChipItem {
    label: string;
    variant?: 'alt' | 'main';
    onClick: () => void;
}

export interface ChatBubble {
    id: number;
    role: 'bot' | 'user';
    text: string;
}