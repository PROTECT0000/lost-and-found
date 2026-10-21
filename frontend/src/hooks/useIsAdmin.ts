import { selectIsAdmin, useAuthStore } from '../store/useAuthStore'

export const useIsAdmin = () => useAuthStore(selectIsAdmin)
