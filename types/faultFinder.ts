// fault_knowledge: id, model_name, fault_type, description, solution,
//                  part_required, severity, created_by, created_at, updated_at
// model_errors:    id, brand, model_name, error_code, support_code,
//                  series, cause, remedy, severity, created_at

export interface FaultKnowledge {
    id: string;
    model_name: string;
    fault_type: string;
    description?: string;
    solution?: string;
    part_required?: string;
    severity?: string;
    created_by?: string;
    created_at?: string;
    updated_at?: string;
}

export interface FaultKnowledgeForm {
    model_name: string;
    fault_type: string;
    description: string;
    solution: string;
    part_required: string;
    severity: string;
}

export const emptyFaultForm: FaultKnowledgeForm = {
    model_name: '', fault_type: '', description: '',
    solution: '', part_required: '', severity: 'Medium',
};

export interface ModelError {
    id: string;
    brand?: string;
    model_name?: string;
    error_code?: string;
    support_code?: string;
    series?: string;
    cause?: string;
    remedy?: string;
    severity?: string;
    created_at?: string;
}

export const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];
export type FaultFinderTab = 'fault-knowledge' | 'error-codes';