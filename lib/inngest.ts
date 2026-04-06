import { Inngest } from 'inngest'

export const inngest = new Inngest({
  id:       'basalith-xyz',
  name:     'Basalith XYZ',
  eventKey: process.env.INNGEST_EVENT_KEY,
})
