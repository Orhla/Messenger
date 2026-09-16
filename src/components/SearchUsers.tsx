'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import type { Profile } from '@/lib/types';
import { searchProfiles } from '@/lib/profiles';

type Props = {
    onSelectReceiver: (profile: Profile) => void;
};

export default function SearchUsers({ onSelectReceiver }: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Profile[]>([]);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }
        searchProfiles(searchQuery).then(setSearchResults);
    }, [searchQuery]);

    const handleSelectReceiver = (profile: Profile) => {
        onSelectReceiver(profile);
        setSearchQuery('');
        setSearchResults([]);
    };

    return (
        <div className="p-3 border-b bg-muted/30 relative z-10">
            <Input
                type="text"
                placeholder="Найти пользователя..."
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
