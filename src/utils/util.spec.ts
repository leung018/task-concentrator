import { describe, expect, it } from 'vitest'
import { formatNumber, getDomain, getMostRecentDate, getNumberWithOrdinal } from './util'
import { Time } from '../domain/time'

describe('formatNumber', () => {
  it('should format number', () => {
    expect(formatNumber(0, 2)).toBe('00')
    expect(formatNumber(9)).toBe('09') // default minDigits is 2
    expect(formatNumber(10, 2)).toBe('10')
    expect(formatNumber(59, 2)).toBe('59')

    expect(formatNumber(0, 1)).toBe('0')
    expect(formatNumber(1, 3)).toBe('001')
  })
})

describe('getNumberWithOrdinal', () => {
  it('should return number with ordinal', () => {
    expect(getNumberWithOrdinal(1)).toBe('1st')
    expect(getNumberWithOrdinal(2)).toBe('2nd')
    expect(getNumberWithOrdinal(3)).toBe('3rd')
    expect(getNumberWithOrdinal(4)).toBe('4th')
    expect(getNumberWithOrdinal(10)).toBe('10th')

    expect(getNumberWithOrdinal(11)).toBe('11th')
    expect(getNumberWithOrdinal(12)).toBe('12th')
    expect(getNumberWithOrdinal(13)).toBe('13th')
    expect(getNumberWithOrdinal(14)).toBe('14th')

    expect(getNumberWithOrdinal(21)).toBe('21st')
    expect(getNumberWithOrdinal(22)).toBe('22nd')
    expect(getNumberWithOrdinal(23)).toBe('23rd')
    expect(getNumberWithOrdinal(24)).toBe('24th')

    expect(getNumberWithOrdinal(101)).toBe('101st')

    expect(getNumberWithOrdinal(111)).toBe('111th')
    expect(getNumberWithOrdinal(112)).toBe('112th')
    expect(getNumberWithOrdinal(113)).toBe('113th')
  })
})

describe('getMostRecentDate', () => {
  it('should return today time if already passed', () => {
    expect(getMostRecentDate(new Time(15, 0), new Date('2021-01-01T23:59:00'))).toEqual(
      new Date('2021-01-01T15:00:00')
    )
    expect(getMostRecentDate(new Time(15, 0), new Date('2021-01-01T15:00:00'))).toEqual(
      new Date('2021-01-01T15:00:00')
    )
  })

  it('should return yesterday time if not yet passed', () => {
    expect(getMostRecentDate(new Time(15, 0), new Date('2021-01-01T14:59:00'))).toEqual(
      new Date('2020-12-31T15:00:00')
    )
  })
})

describe('getDomain', () => {
  it('should extract domain from URL with www', () => {
    expect(getDomain('https://www.example.com')).toBe('example.com')
    expect(getDomain('http://www.example.com')).toBe('example.com')
  })

  it('should extract domain from URL without www', () => {
    expect(getDomain('https://example.com')).toBe('example.com')
    expect(getDomain('http://example.com')).toBe('example.com')
  })

  it('should extract domain with URL / at the end', () => {
    expect(getDomain('https://www.example.com/')).toBe('example.com')
    expect(getDomain('http://example.com/')).toBe('example.com')
  })

  it('should extract domain from URL without protocol but with www', () => {
    expect(getDomain('www.example.com')).toBe('example.com')
  })

  it('should extract domain from URL without protocol and www', () => {
    expect(getDomain('example.com')).toBe('example.com')
  })

  it('should extract domain and ignore paths', () => {
    expect(getDomain('https://www.example.com/path/to/resource')).toBe('example.com')
  })

  it('should keep subdomain', () => {
    expect(getDomain('subdomain.example.com')).toBe('subdomain.example.com')
  })

  it('should be case insensitive', () => {
    expect(getDomain('HTTPS://www.EXAMPLE.com')).toBe('example.com')
  })
})
