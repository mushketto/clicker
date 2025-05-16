import { useState, useEffect, useRef } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { useMainStats } from '../hooks/useMainStats';


export function useLeaderboard({ db, userId, initialized }) {
    const [leaders, setLeaders] = useState([]);
    const [loading, setLoading] = useState(true);
    const isReady = db && initialized;

    const {
        username,
        totalCount,
        multiplier,
        loading: statsLoading,
    } = useMainStats({ db, userId, initialized });

    useEffect(() => {
        if (!isReady) return;

        const fetchLeaderboard = async () => {
        try {
            const usersSnap = await db.collection('users').get();
            const results = [];

            for (const userDoc of usersSnap.docs) {
            const statsRef = db.collection('users').doc(userDoc.id).collection('stats');
            const statsSnap = await statsRef.get();

            const data = {};
            statsSnap.forEach(doc => {
                data[doc.id] = doc.data().value;
            });

            const updates = [];

            if (data.username === undefined) {
                const generatedName = `Гравець-${userDoc.id.slice(0, 4)}`;
                updates.push(statsRef.doc('username').set({ value: generatedName }));
                data.username = generatedName;
            }

            if (data.totalCount === undefined) {
                updates.push(statsRef.doc('totalCount').set({ value: 0 }));
                data.totalCount = 0;
            }

            if (data.multiplier === undefined) {
                updates.push(statsRef.doc('multiplier').set({ value: 1 }));
                data.multiplier = 1;
            }

            if (updates.length > 0) {
                await Promise.all(updates);
            }

            results.push({
                userId: userDoc.id,
                username: data.username,
                totalCount: data.totalCount,
                multiplier: data.multiplier,
            });
            }

            results.sort((a, b) => b.totalCount - a.totalCount);
            setLeaders(results);
        } catch (err) {
            console.error('[ЛІДЕРБОРД] Помилка завантаження:', err);
        } finally {
            setLoading(false);
        }
        };

        fetchLeaderboard();
    }, [isReady]);

    let displayList = {};

    if (loading) {
        displayList = {
        top10: Array.from({ length: 10 }, (_, i) => ({
            userId: `loading-${i}`,
            username: '...',
            totalCount: '...',
            multiplier: '...',
            place: i + 1,
            isCurrentUser: false,
        })),
        currentUser: null,
        };
    } else {
        const fullList = leaders.map((user, index) => ({
        ...user,
        place: index + 1,
        isCurrentUser: user.userId == userId,
        }));
    
        const top10 = fullList.slice(0, 10);
    
        // Якщо поточний користувач у топ-10, він вже є в списку з прапорцем isCurrentUser
        const currentUserInTop = top10.some(u => u.userId == userId);
        const currentUser = currentUserInTop
        ? null
        : fullList.find(user => user.userId == userId);
    
        displayList = {
        top10,
        currentUser,
        };



    }

    return {
        loading,
        displayList
    };
}