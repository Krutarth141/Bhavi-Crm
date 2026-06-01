'use client';

interface CustomerSearchBarProps {
    onSearch: (query: string) => void;
    placeholder?: string;
}

export default function CustomerSearchBar({
    onSearch,
    placeholder = 'Search by name, mobile, serial, city...'
}: CustomerSearchBarProps) {
    return (
        <div
            style={{
                marginBottom: '16px',
                display: 'flex',
                gap: '8px'
            }}
        >
            <input
                type="text"
                placeholder={placeholder}
                onChange={e => onSearch(e.target.value)}
                style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit'
                }}
            />
        </div>
    );
}
