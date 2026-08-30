// fault_knowledge: id, model_name, fault_type, description, solution,
//                  part_required, severity, created_by, created_at, updated_at

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

export const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];