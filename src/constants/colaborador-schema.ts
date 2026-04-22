export type FieldType = 'text' | 'date' | 'select' | 'number';

export interface FieldConfig {
    id: string;
    label: string;
    section: 'dados_pessoais' | 'logistica' | 'rh_saude' | 'suprimentos';
    type: FieldType;
    options?: string; // Nome da lista de opções (ex: 'hoteis', 'clinicas')
    placeholder?: string;
}

export const COLABORADOR_SCHEMA: FieldConfig[] = [
    // --- SEÇÃO: DADOS PESSOAIS ---
    { id: 're', label: 'RE (Registro)', section: 'dados_pessoais', type: 'text' },
    { id: 'nome', label: 'Nome Completo', section: 'dados_pessoais', type: 'text' },
    { id: 'cpf', label: 'CPF', section: 'dados_pessoais', type: 'text' },
    { id: 'funcao', label: 'Função CLT', section: 'dados_pessoais', type: 'text' },
    { id: 'dt_nasc', label: 'Data de Nascimento', section: 'dados_pessoais', type: 'date' },
    { id: 'sexo', label: 'Sexo', section: 'dados_pessoais', type: 'select', options: 'sexo' },
    { id: 'telefone', label: 'Telefone/WhatsApp', section: 'dados_pessoais', type: 'text' },
    { id: 'municipio', label: 'Cidade', section: 'dados_pessoais', type: 'text' },
    { id: 'uf', label: 'UF', section: 'dados_pessoais', type: 'text' },
    { id: 'endereco', label: 'Endereço Residencial', section: 'dados_pessoais', type: 'text' },

    // --- SEÇÃO: RH E SAÚDE (Baseado no REFUNC) ---
    { id: 'status_adm', label: 'Status Admissional', section: 'rh_saude', type: 'select', options: 'status_refunc' },
    { id: 'clinica', label: 'Clínica de Exame', section: 'rh_saude', type: 'select', options: 'clinicas' },
    { id: 'data_exame', label: 'Data do Exame', section: 'rh_saude', type: 'date' },
    { id: 'aso_status', label: 'Status ASO', section: 'rh_saude', type: 'text' },
    { id: 'data_admissao', label: 'Data Admissão', section: 'rh_saude', type: 'date' },
    { id: 'contrato_tipo', label: 'Tipo de Contrato', section: 'rh_saude', type: 'select', options: 'contratos' },
    { id: 'treinamento', label: 'Status Treinamento', section: 'rh_saude', type: 'text' },
    { id: 'ponto_batida', label: 'Cartão Ponto', section: 'rh_saude', type: 'text' },
    { id: 'cracha', label: 'Status Crachá', section: 'rh_saude', type: 'text' },
    { id: 'enviado_rh', label: 'Enviado ao RH', section: 'rh_saude', type: 'text' },

    // --- SEÇÃO: LOGÍSTICA (Baseado no Controle Geral) ---
    { id: 'hotel', label: 'Hotel Hospedado', section: 'logistica', type: 'select', options: 'hoteis' },
    { id: 'quarto', label: 'Nº do Quarto/Apto', section: 'logistica', type: 'text' },
    { id: 'tipo_apto', label: 'Tipo de Acomodação', section: 'logistica', type: 'text' },
    { id: 'checkin_data', label: 'Data Check-in', section: 'logistica', type: 'date' },
    { id: 'turno_semana', label: 'Turno (2ª a 6ª)', section: 'logistica', type: 'select', options: 'turnos' },
    { id: 'rota_transporte', label: 'Rota de Transporte', section: 'logistica', type: 'text' },
    { id: 'tipo_transporte', label: 'Tipo de Veículo', section: 'logistica', type: 'text' },
    { id: 'coordenador', label: 'Coordenador Resp.', section: 'logistica', type: 'text' },
    { id: 'supervisor', label: 'Supervisor Resp.', section: 'logistica', type: 'text' },
    { id: 'encarregado', label: 'Encarregado Resp.', section: 'logistica', type: 'text' },
    { id: 'local_trabalho', label: 'Frente de Trabalho', section: 'logistica', type: 'text' },
    { id: 'setor_trabalho', label: 'Setor de Atuação', section: 'logistica', type: 'text' },

    // --- SEÇÃO: SUPRIMENTOS E OUTROS ---
    { id: 'vr_status', label: 'Vale Refeição (VR)', section: 'suprimentos', type: 'text' },
    { id: 'uniforme_tam', label: 'Tamanho Uniforme', section: 'suprimentos', type: 'text' },
    { id: 'epi_status', label: 'Entrega de EPIs', section: 'suprimentos', type: 'text' },
    { id: 'c_custo', label: 'Centro de Custo', section: 'suprimentos', type: 'text' },
    { id: 'obs_geral', label: 'Observações Gerais', section: 'suprimentos', type: 'text' },
    { id: 'data_desligamento', label: 'Data de Demissão', section: 'suprimentos', type: 'date' },
];