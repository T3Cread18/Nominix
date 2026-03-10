import React, { useState } from 'react';
import { Route, Routes, useNavigate, useParams } from 'react-router-dom';
import TasksSidebar from './TasksSidebar';
import TasksDashboard from './TasksDashboard';
import TasksBoard from './TasksBoard';
import TaskDetail from './TaskDetail';
import ChecklistTemplateManager from './ChecklistTemplateManager';
import ChecklistTemplateForm from './ChecklistTemplateForm';

export default function TasksModule() {
    const navigate = useNavigate();
    const [selectedTemplate, setSelectedTemplate] = useState(null);

    const handleBackToManager = () => setSelectedTemplate(null);

    return (
        <div className="flex min-h-[calc(100vh-140px)] gap-2 lg:gap-8 max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-10">
            {/* Sidebar Modular (Estilo Mockup) */}
            <TasksSidebar />

            {/* Area de Contenido */}
            <div className="flex-1 min-w-0">
                <Routes>
                    {/* Dashboard es la ruta principal */}
                    <Route path="/" element={<TasksDashboard />} />

                    {/* Tablero de tareas */}
                    <Route path="/board" element={<TasksBoard onSelectTask={(id) => navigate(`/audits/detail/${id}`)} />} />

                    {/* Detalle de tarea (URL protegida para no romper el sidebar) */}
                    <Route path="/detail/:id" element={<TaskDetailWithParams onBack={() => navigate('/audits/board')} />} />

                    {/* Gestión de Plantillas */}
                    <Route path="/templates" element={
                        selectedTemplate ? (
                            <ChecklistTemplateForm
                                templateId={selectedTemplate}
                                onBack={handleBackToManager}
                            />
                        ) : (
                            <ChecklistTemplateManager
                                onSelectTemplate={setSelectedTemplate}
                            />
                        )
                    } />

                    <Route path="/actions" element={<Placeholder title="Planes de Acción" />} />
                </Routes>
            </div>
        </div>
    );
}

function TaskDetailWithParams({ onBack }) {
    const { id } = useParams();
    return <TaskDetail taskId={id} onBack={onBack} />;
}

function Placeholder({ title }) {
    return (
        <div className="flex flex-col items-center justify-center h-full py-20 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
            <div className="bg-white p-6 rounded-full shadow-sm mb-4">
                <h2 className="text-2xl font-black text-slate-300 uppercase tracking-tighter italic">Nóminix</h2>
            </div>
            <h3 className="text-xl font-bold text-slate-800">{title}</h3>
            <p className="text-slate-500 mt-2">Esta funcionalidad se encuentra en desarrollo según el mockup.</p>
        </div>
    );
}
