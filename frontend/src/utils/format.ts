import dayjs from 'dayjs'

/** SQLite `datetime('now')` values are UTC without a timezone marker. */
export const parseServerDate = (value: string) => dayjs(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`)

export const formatDate = (value: string) => parseServerDate(value).format('DD MMM YYYY')

export const formatDateTime = (value: string) => parseServerDate(value).format('DD MMM YYYY, HH:mm')
