import type { ComponentType } from 'react'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

import { template as waitlisted } from './waitlisted'
import { template as approved } from './approved'
import { template as promoted } from './promoted'
import { template as paid } from './paid'
import { template as hostApplicationReceived } from './host-application-received'
import { template as adminNewHostApplication } from './admin-new-host-application'
import { template as adminNewJoinRequest } from './admin-new-join-request'
import { template as irieRsvpNotification } from './irie-rsvp-notification'
import { template as molinoOrderNotification } from './molino-order-notification'
import { template as molinoOrderConfirmation } from './molino-order-confirmation'
import { template as chefOrderPaid } from './chef-order-paid'
import { template as chefNewOrder } from './chef-new-order'
import { template as paymentsGoLiveReminder } from './payments-go-live-reminder'
import { template as chefEventInvite } from './chef-event-invite'
import { template as hostApproved } from './host-approved'
import { template as vintage1986Rsvp } from './vintage-1986-rsvp'
import { template as addressUpdate } from './address-update'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'waitlisted': waitlisted,
  'approved': approved,
  'promoted': promoted,
  'paid': paid,
  'host-application-received': hostApplicationReceived,
  'admin-new-host-application': adminNewHostApplication,
  'admin-new-join-request': adminNewJoinRequest,
  'irie-rsvp-notification': irieRsvpNotification,
  'molino-order-notification': molinoOrderNotification,
  'molino-order-confirmation': molinoOrderConfirmation,
  'chef-order-paid': chefOrderPaid,
  'chef-new-order': chefNewOrder,
  'payments-go-live-reminder': paymentsGoLiveReminder,
  'chef-event-invite': chefEventInvite,
  'host-approved': hostApproved,
  'vintage-1986-rsvp': vintage1986Rsvp,
  'address-update': addressUpdate,
}
