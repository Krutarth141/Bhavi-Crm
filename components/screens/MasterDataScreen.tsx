'use client';

import { useState } from 'react';
import { MasterTabId } from '@/types/masters';
import { useMasters } from '@/hooks/useMasters';
import BrandsTab from './masters/BrandsTab';
import SubCategoriesTab from './masters/SubCategoriesTab';
import ModelsTab from './masters/ModelsTab';
import ProblemTypesTab from './masters/ProblemTypesTab';
import InventoryMasterTab from './masters/InventoryMasterTab';

const tabs: { id: MasterTabId; label: string }[] = [
    { id: 'brands', label: '🏷️ Brands' },
    { id: 'subcategories', label: '📂 Sub-Categories' },
    { id: 'models', label: '📱 Models' },
    { id: 'problems', label: '🔧 Problem Types' },
    { id: 'inventory', label: '📦 Inventory' },
];

export default function MasterDataScreen() {
    const [activeTab, setActiveTab] = useState<MasterTabId>('brands');

    const {
        brands, subcategories, models, problemTypes,
        loading, error, fetchAll,
        saveBrand, removeBrand,
        saveSubCategory, removeSubCategory,
        saveModel, removeModel,
        saveProblemType, toggleProblem, removeProblemType,
    } = useMasters();

    const renderTab = () => {
        if (loading && activeTab !== 'inventory') {
            return <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 30 }}>Loading...</p>;
        }

        switch (activeTab) {
            case 'brands':
                return (
                    <BrandsTab
                        brands={brands}
                        onAdd={saveBrand}
                        onDelete={removeBrand}
                        onRefresh={fetchAll}
                    />
                );

            case 'subcategories':
                return (
                    <SubCategoriesTab
                        brands={brands}
                        subcategories={subcategories}
                        onAdd={saveSubCategory}
                        onDelete={removeSubCategory}
                        onRefresh={fetchAll}
                    />
                );

            case 'models':
                return (
                    <ModelsTab
                        brands={brands}
                        subcategories={subcategories}
                        models={models}
                        onAdd={saveModel}
                        onDelete={removeModel}
                        onRefresh={fetchAll}
                    />
                );

            case 'problems':
                return (
                    <ProblemTypesTab
                        brands={brands}
                        problemTypes={problemTypes}
                        onAdd={saveProblemType}
                        onToggle={toggleProblem}
                        onDelete={removeProblemType}
                    />
                );

            case 'inventory':
                return <InventoryMasterTab />;

            default:
                return null;
        }
    };

    return (
        <div className="screen-container">
            <h2>⚙️ Master Data Management</h2>

            {error && (
                <div className="alert alert-danger" style={{ marginBottom: 12 }}>{error}</div>
            )}

            {/* Tabs */}
            <div className="tabs" style={{ marginBottom: 18 }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {renderTab()}
        </div>
    );
}