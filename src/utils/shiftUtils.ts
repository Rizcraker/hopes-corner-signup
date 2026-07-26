import type { Shift } from '../types/shift'

// Helper: turns a day number into its ordinal form (1st, 2nd, 3rd, 4th...)
export const getOrdinalDay = (day: number) => {
  const suffixes = ['th', 'st', 'nd', 'rd']
  const remainder = day % 100
  return day + (suffixes[(remainder - 20) % 10] || suffixes[remainder] || suffixes[0])
}

// Returns the next `count` calendar dates that fall on any of the given weekdays (0=Sun..6=Sat)
export const getUpcomingDatesForWeekdays = (weekdays: number[], count: number): Date[] => {
  const dates: Date[] = []
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  while (dates.length < count) {
    if (weekdays.includes(cursor.getDay())) {
      dates.push(new Date(cursor))
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

// Builds a fully-formed Shift object (with all derived date/time fields) for sample/testing data
export const buildSampleShift = (
  id: number,
  role: string,
  date: Date,
  startHour: number,
  startMinute: number,
  endHour: number,
  endMinute: number,
  location: string,
  description: string,
  requirements: string,
  spotsLeft: number
): Shift => {
  const startDate = new Date(date)
  startDate.setHours(startHour, startMinute, 0, 0)
  const endDate = new Date(date)
  endDate.setHours(endHour, endMinute, 0, 0)

  const formattedDate = startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const startTime = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  const endTime = endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  const weekdayLong = startDate.toLocaleDateString('en-US', { weekday: 'long' })
  const monthLong = startDate.toLocaleDateString('en-US', { month: 'long' })

  return {
    id: String(id),
    role,
    time: `${formattedDate} · ${startTime} - ${endTime}`,
    location,
    description,
    requirements,
    spotsLeft,
    startDate,
    dateLabel: `${weekdayLong}, ${monthLong} ${getOrdinalDay(startDate.getDate())}`,
    timeLabel: `${startTime} - ${endTime}`,
    jobId: null,
    capacity: spotsLeft,
    password: null
  }
}

// Placeholder / testing data covering all 9 shift categories, with several upcoming dates each
export const generateSampleShifts = (): Shift[] => {
  const MON = 1, TUE = 2, WED = 3, THU = 4, FRI = 5, SAT = 6

  const roleConfigs: {
    role: string
    weekdays: number[]
    start: [number, number]
    end: [number, number]
    location: string
    description: string
    requirements: string
    spotsLeft: number
  }[] = [
    {
      role: 'Monday Breakfast Service',
      weekdays: [MON], start: [7, 15], end: [9, 30],
      location: 'Main Hall / Kitchen',
      description: 'Serve breakfast to guests, bus tables, and help keep the line moving.',
      requirements: 'Age 16+, ability to stand for 3+ hours, friendly attitude.',
      spotsLeft: 15
    },
    {
      role: 'Mon & Wed Kitchen Assistant',
      weekdays: [MON, WED], start: [7, 0], end: [9, 0],
      location: 'Main Kitchen',
      description: 'Assist kitchen staff with food prep, cooking, and cleanup before service.',
      requirements: 'Age 18+, comfortable in a fast-paced kitchen environment.',
      spotsLeft: 6
    },
    {
      role: 'Program Assistant (Shower & Laundry)',
      weekdays: [MON, WED], start: [8, 0], end: [10, 0],
      location: 'Shower & Laundry Trailer',
      description: 'Help guests sign up for shower/laundry slots and keep the area running smoothly.',
      requirements: 'Age 16+, comfortable working directly with guests.',
      spotsLeft: 8
    },
    {
      role: 'RV Meal (Kitchen Assistant)',
      weekdays: [TUE, THU], start: [15, 0], end: [17, 0],
      location: 'Main Kitchen',
      description: 'Prep and pack meals for RV meal delivery routes.',
      requirements: 'Age 16+, ability to lift up to 20 lbs.',
      spotsLeft: 5
    },
    {
      role: 'Friday PM Food Recovery',
      weekdays: [FRI], start: [14, 0], end: [16, 0],
      location: 'Loading Dock',
      description: 'Pick up and sort recovered food donations from local partners.',
      requirements: "Age 16+, valid driver's license preferred.",
      spotsLeft: 4
    },
    {
      role: 'Friday PM Kitchen Prep',
      weekdays: [FRI], start: [12, 0], end: [14, 0],
      location: 'Main Kitchen',
      description: 'Prep ingredients and set up the kitchen for Saturday breakfast service.',
      requirements: 'Age 16+.',
      spotsLeft: 7
    },
    {
      role: 'Sat Breakfast Service',
      weekdays: [SAT], start: [8, 45], end: [11, 15],
      location: 'Main Hall / Kitchen',
      description: 'Serve breakfast to guests during our largest weekly service.',
      requirements: 'Age 16+, ability to stand for 3+ hours, friendly attitude.',
      spotsLeft: 15
    },
    {
      role: 'Sat Basement Clothing Organizer',
      weekdays: [SAT], start: [9, 0], end: [11, 0],
      location: 'Basement Clothing Closet',
      description: 'Sort, fold, and organize donated clothing and supplies.',
      requirements: 'Ages 14-15 welcome with a signed-up chaperone; 16+ may sign up solo.',
      spotsLeft: 10
    },
    {
      role: 'Sat RV Meal Delivery',
      weekdays: [SAT], start: [11, 0], end: [13, 0],
      location: 'Parking Lot / RV Route',
      description: 'Ride along and help deliver packed meals to RV community sites.',
      requirements: 'Ages 14-15 welcome with a signed-up chaperone; 16+ may sign up solo.',
      spotsLeft: 6
    }
  ]

  let idCounter = 1
  const sampleShifts: Shift[] = []

  roleConfigs.forEach(config => {
    const dates = getUpcomingDatesForWeekdays(config.weekdays, 4) // 4 upcoming dates per role
    dates.forEach(date => {
      sampleShifts.push(
        buildSampleShift(
          idCounter++,
          config.role,
          date,
          config.start[0], config.start[1],
          config.end[0], config.end[1],
          config.location,
          config.description,
          config.requirements,
          config.spotsLeft
        )
      )
    })
  })

  return sampleShifts
}
