import { describe, expect, it } from 'vitest'

import BlockedDomainsPage from './BlockedDomainsPage.vue'
import { BrowsingRulesStorageService } from '../domain/browsing_rules/storage'
import { flushPromises, mount, VueWrapper } from '@vue/test-utils'
import { BrowsingRules } from '../domain/browsing_rules'
import { FakeBrowsingControlService } from '../domain/browsing_control'
import { startBackgroundListener } from '../test_utils/listener'

describe('BlockedDomainsPage', () => {
  it('should render blocked domains', async () => {
    const browsingRulesStorageService = BrowsingRulesStorageService.createFake()
    await browsingRulesStorageService.save(
      new BrowsingRules({ blockedDomains: ['example.com', 'facebook.com'] })
    )

    const { wrapper } = await mountBlockedDomainsPage({ browsingRulesStorageService })
    await flushPromises()

    assertDomainsDisplayed(wrapper, ['example.com', 'facebook.com'])
  })

  it('should able to add new blocked domain', async () => {
    const { wrapper, browsingRulesStorageService } = await mountBlockedDomainsPage()

    await addBlockedDomain(wrapper, 'example.com')

    assertDomainsDisplayed(wrapper, ['example.com'])

    expect((await browsingRulesStorageService.get()).blockedDomains).toEqual(['example.com'])

    await addBlockedDomain(wrapper, 'facebook.com')

    assertDomainsDisplayed(wrapper, ['example.com', 'facebook.com'])

    expect((await browsingRulesStorageService.get()).blockedDomains).toEqual([
      'example.com',
      'facebook.com'
    ])
  })

  it('should clear input box after adding new domain', async () => {
    const { wrapper } = await mountBlockedDomainsPage()

    await addBlockedDomain(wrapper, 'example.com')

    const inputElement = wrapper.find("[data-test='blocked-domain-input']")
      .element as HTMLInputElement
    expect(inputElement.value).toBe('')
  })

  it('should not save blocked domain when input box is empty', async () => {
    const { wrapper, browsingRulesStorageService } = await mountBlockedDomainsPage()

    await addBlockedDomain(wrapper, '')
    await addBlockedDomain(wrapper, '  ')

    assertDomainsDisplayed(wrapper, [])
    expect((await browsingRulesStorageService.get()).blockedDomains).toEqual([])
  })

  it('should save domain in trimmed format', async () => {
    const { wrapper, browsingRulesStorageService } = await mountBlockedDomainsPage()

    await addBlockedDomain(wrapper, '  example.com  ')
    assertDomainsDisplayed(wrapper, ['example.com'])

    expect((await browsingRulesStorageService.get()).blockedDomains).toEqual(['example.com'])
  })

  it('should able to remove added domain', async () => {
    const browsingRulesStorageService = BrowsingRulesStorageService.createFake()
    await browsingRulesStorageService.save(
      new BrowsingRules({ blockedDomains: ['example.com', 'facebook.com'] })
    )

    const { wrapper } = await mountBlockedDomainsPage({ browsingRulesStorageService })
    await flushPromises()

    await removeBlockedDomain(wrapper, 'example.com')

    assertDomainsDisplayed(wrapper, ['facebook.com'])
    expect((await browsingRulesStorageService.get()).blockedDomains).toEqual(['facebook.com'])
  })

  it('should update activated redirect when domain is added', async () => {
    const { fakeBrowsingControlService, wrapper } = await mountBlockedDomainsPage()

    await addBlockedDomain(wrapper, 'example.com')
    expect(fakeBrowsingControlService.getActivatedBrowsingRules()).toEqual(
      new BrowsingRules({ blockedDomains: ['example.com'] })
    )
  })

  it('should update activated redirect when domain is removed', async () => {
    const browsingRulesStorageService = BrowsingRulesStorageService.createFake()
    await browsingRulesStorageService.save(
      new BrowsingRules({ blockedDomains: ['example.com', 'facebook.com'] })
    )

    const { wrapper, fakeBrowsingControlService } = await mountBlockedDomainsPage({
      browsingRulesStorageService
    })
    await flushPromises()

    await removeBlockedDomain(wrapper, 'example.com')
    expect(fakeBrowsingControlService.getActivatedBrowsingRules()).toEqual(
      new BrowsingRules({ blockedDomains: ['facebook.com'] })
    )
  })
})

async function mountBlockedDomainsPage({
  browsingRulesStorageService = BrowsingRulesStorageService.createFake()
} = {}) {
  const fakeBrowsingControlService = new FakeBrowsingControlService()
  const { communicationManager } = await startBackgroundListener({
    browsingControlService: fakeBrowsingControlService,
    browsingRulesStorageService
  })
  const wrapper = mount(BlockedDomainsPage, {
    props: { browsingRulesStorageService, port: communicationManager.clientConnect() }
  })

  return { wrapper, browsingRulesStorageService, fakeBrowsingControlService }
}

async function addBlockedDomain(wrapper: VueWrapper, domain: string) {
  const inputElement = wrapper.find("[data-test='blocked-domain-input']")
  await inputElement.setValue(domain)

  const addButton = wrapper.find("[data-test='add-button']")
  addButton.trigger('click')
  await flushPromises()
}

async function removeBlockedDomain(wrapper: VueWrapper, domain: string) {
  const removeButton = wrapper.find(`[data-test='remove-${domain}']`)
  await removeButton.trigger('click')
  await flushPromises()
}

function assertDomainsDisplayed(wrapper: VueWrapper, domains: string[]) {
  const blockedDomains = wrapper.findAll("[data-test='blocked-domain']")
  expect(blockedDomains.length).toBe(domains.length)

  for (let i = 0; i < domains.length; i++) {
    expect(blockedDomains[i].text()).toBe(domains[i])
  }
}
