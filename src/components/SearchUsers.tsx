'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import type { Profile } from '@/lib/types';
import { searchProfiles } from '@/lib/profiles';

type Props = {
    onSelect: (profile: Profile) => void;
    excludeIds?: string[];
    placeholder?: string;
    className?: string;
};

export default function SearchUsers({
    onSelect,
    excludeIds = [],
    placeholder = 'Найти пользователя...',
    className = 'relative',
}: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Profile[]>([]);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }
        let cancelled = true;

        const delayDebounceFn = setTimeout(() => {
            searchProfiles(searchQuery)
                .then((results) => {
                    if (!cancelled) return;

                    const filteredResults = results.filter(
                        (profile) => !excludeIds.includes(profile.id),
                    );
                    setSearchResults(filteredResults);
                })
                .catch((error) => {
                    console.error('Ошибка при поиске пользователей:', error);
                    setSearchResults([]);
                });
        }, 300);

        return () => {
            cancelled = false;
            clearTimeout(delayDebounceFn);
        };
    }, [searchQuery]);

    const handleSelectReceiver = (profile: Profile) => {
        onSelect(profile);
        setSearchQuery('');
        setSearchResults([]);
    };

    return (
        <div className={className}>
            <Input
                type="text"
                placeholder={placeholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
            />

            {/* Выпадающий список результатов поиска */}
            {searchResults.length > 0 && (
                <div className="absolute left-3 right-3 mt-1 max-h-60 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95">
                    <div className="p-1">
                        {searchResults.map((profile) => (
                            <Button
                                key={profile.id}
                                variant="ghost"
                                onClick={() => handleSelectReceiver(profile)}
                                className="w-full justify-start flex flex-col items-start h-auto px-4 py-2 font-normal"
                            >
                                <span className="font-medium text-sm text-foreground">
                                    {profile.email || 'Пользователь'}
                                </span>
                            </Button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
