import WidgetKit
import SwiftUI

private let appGroup = "group.com.dialin.coffeecoach"

// MARK: - Data

struct BrewPlanEntry: TimelineEntry {
  let date: Date
  let coffee: String
  let tweak: String
  let streak: Int
  let brewedToday: Bool
}

private func localDayKey(_ date: Date) -> String {
  let formatter = DateFormatter()
  formatter.dateFormat = "yyyy-MM-dd"
  return formatter.string(from: date)
}

private func loadEntry() -> BrewPlanEntry {
  let defaults = UserDefaults(suiteName: appGroup)
  let coffee = defaults?.string(forKey: "planCoffee") ?? ""
  let tweak = defaults?.string(forKey: "planTweak") ?? ""
  let streak = Int(defaults?.string(forKey: "planStreak") ?? "") ?? 0
  // "Brewed today" is stored as the day it happened so it goes stale at
  // midnight on its own, even if the app isn't opened again.
  let brewedDay = defaults?.string(forKey: "planBrewedDay") ?? ""
  let brewedToday = !brewedDay.isEmpty && brewedDay == localDayKey(Date())
  return BrewPlanEntry(date: Date(), coffee: coffee, tweak: tweak, streak: streak, brewedToday: brewedToday)
}

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> BrewPlanEntry {
    BrewPlanEntry(date: Date(), coffee: "Kenya Peaberry", tweak: "grind a touch finer", streak: 4, brewedToday: false)
  }

  func getSnapshot(in context: Context, completion: @escaping (BrewPlanEntry) -> Void) {
    completion(context.isPreview ? placeholder(in: context) : loadEntry())
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<BrewPlanEntry>) -> Void) {
    let entry = loadEntry()
    // Refresh shortly after midnight so "Tomorrow's plan" flips back to
    // "Today's plan" without the app being opened.
    var comps = DateComponents()
    comps.hour = 3
    let next = Calendar.current.nextDate(after: Date(), matching: comps, matchingPolicy: .nextTime)
      ?? Date().addingTimeInterval(24 * 60 * 60)
    completion(Timeline(entries: [entry], policy: .after(next)))
  }
}

// MARK: - View

struct BrewPlanWidgetView: View {
  var entry: BrewPlanEntry

  private let espresso = Color(red: 0.17, green: 0.10, blue: 0.05)
  private let cream = Color(red: 0.96, green: 0.94, blue: 0.91)
  private let soft = Color(red: 0.54, green: 0.47, blue: 0.42)

  private var capitalizedTweak: String {
    guard let first = entry.tweak.first else { return "" }
    return first.uppercased() + String(entry.tweak.dropFirst())
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      HStack(alignment: .firstTextBaseline) {
        Text(entry.brewedToday ? "Tomorrow's plan" : "Today's plan")
          .font(.caption)
          .fontWeight(.medium)
          .foregroundStyle(soft)
        Spacer(minLength: 4)
        if entry.streak >= 2 {
          Text("🔥 \(entry.streak)")
            .font(.caption)
            .fontWeight(.semibold)
            .foregroundStyle(espresso)
        }
      }

      Spacer(minLength: 2)

      if entry.tweak.isEmpty {
        Text("☕️")
          .font(.title3)
        Text("Log a brew and your next tweak lands here.")
          .font(.footnote)
          .foregroundStyle(soft)
      } else {
        Text(entry.coffee)
          .font(.headline)
          .foregroundStyle(espresso)
          .lineLimit(1)
        Text(capitalizedTweak)
          .font(.footnote)
          .foregroundStyle(soft)
          .lineLimit(3)
      }

      Spacer(minLength: 0)
    }
    .containerBackground(for: .widget) { cream }
  }
}

// MARK: - Widget

struct BrewPlanWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "BrewPlanWidget", provider: Provider()) { entry in
      BrewPlanWidgetView(entry: entry)
    }
    .configurationDisplayName("Brew Plan")
    .description("This morning's coffee and your one tweak — right where you'll see it before you brew.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

@main
struct BrewPlanWidgetBundle: WidgetBundle {
  var body: some Widget {
    BrewPlanWidget()
  }
}
