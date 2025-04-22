import { writable } from 'svelte/store';

export type EmpDetails = {
    image: string;
    email: string;
    mobile: number;
    name: string;
    empId: string;
};

export type GlobalStore = {
    empDetails: EmpDetails;
    isLoggedIn: boolean;
    token: string;
};

// Initialize from localStorage if available
const getInitialState = (): GlobalStore => {
    if (typeof window !== 'undefined') {
        try {
            const empData = localStorage.getItem('empData');
            const token = localStorage.getItem('empToken');

            return {
                empDetails: empData ? JSON.parse(empData) : {
                    image: '',
                    email: '',
                    mobile: 0,
                    name: '',
                    empId: ''
                },
                isLoggedIn: !!token,
                token: token || ''
            };
        } catch (error) {
            console.error('Error parsing localStorage data:', error);
            return getDefaultState();
        }
    }
    return getDefaultState();
};

const getDefaultState = (): GlobalStore => ({
    empDetails: {
        image: '',
        email: '',
        mobile: 0,
        name: '',
        empId: ''
    },
    isLoggedIn: false,
    token: ''
});

export const writableGlobalStore = writable<GlobalStore>(getInitialState());
// Subscribe to store changes to persist them
if (typeof window !== 'undefined') {
    writableGlobalStore.subscribe((state) => {
        try {
            if (state.isLoggedIn) {
                localStorage.setItem('empData', JSON.stringify(state.empDetails));
                localStorage.setItem('empToken', state.token);
            } else {
                localStorage.removeItem('empData');
                localStorage.removeItem('empToken');
            }
        } catch (error) {
            console.error('Error updating localStorage:', error);
        }
    });
}
