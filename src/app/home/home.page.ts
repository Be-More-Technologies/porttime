import { Component, ChangeDetectorRef } from "@angular/core";
import { NavController, Platform } from "@ionic/angular";
import { NativeStorage } from "@ionic-native/native-storage/ngx";
import * as moment from "moment";

import { GetdataProvider } from "../providers/getdata/getdata";

import {
  AdMobFree,
  AdMobFreeBannerConfig,
  AdMobFreeInterstitialConfig
} from "@ionic-native/admob-free/ngx";

// import 'rxjs/Rx';
@Component({
  selector: "app-home",
  templateUrl: "home.page.html",
  styleUrls: ["home.page.scss"]
})
export class HomePage {
  daysRemaining: any;
  numberOfDaysRemaining: number;
  eventSource = [];
  viewTitle: string;
  selectedDay = new Date();
  daysInMonth: number = 0;
  calendarData: any;
  payperiods: any;
  currentPayPeriod: any;
  totalDaysWorked: Array<any> = [];
  mustWorkDays: any;
  requiredDaysToWork: number = 0;
  beginningDate: any;
  endingDate: any;
  array: Array<any> = [];
  stop = false;

  currentDayEvents: any;

  eventsAdded: number = 0;

  calendar = {
    mode: "month",
    currentDate: new Date()
  };

  constructor(
    public navCtrl: NavController,
    private storage: NativeStorage,
    private platform: Platform,
    private getdataProvider: GetdataProvider,
    private admobFree: AdMobFree,
    private changeDetectorRef: ChangeDetectorRef
  ) {
    this.eventsAdded = 0;
    this.daysInMonth = moment().daysInMonth();

    this.platform.ready().then(() => {
      const bannerConfig: AdMobFreeBannerConfig = {
        // add your config here
        // for the sake of this example we will just use the test config
        // isTesting: true,
        autoShow: true,
        id: "ca-app-pub-5742208320359495/3907345214"
      };
      this.admobFree.banner.config(bannerConfig);

      this.admobFree.banner
        .prepare()
        .then(() => {
          // banner Ad is ready
          // if we set autoShow to false, then we will need to call the show method here
        })
        .catch(e => console.log(e));

      this.getdataProvider.getObjectData().subscribe(data => {
        (this.payperiods = data), error => alert(error);

        this.currentPayPeriod = this.payperiods.find(x => {
          const currentDate = this.calendar.currentDate;
          currentDate.setHours(0, 0, 0, 0);
          return new Date(x.endingDate) >= currentDate;
        });

        this.beginningDate = this.currentPayPeriod.beginningDate;
        this.endingDate = this.currentPayPeriod.endingDate;
        
        this.dayRemaningToWork();

        this.storage
          .getItem(this.currentPayPeriod["year"] + "")
          .then(events => {
            if (events == null) {
              this.eventSource = [];
            } else {
              for (let event of events) {
                event.startTime = new Date(event.startTime);
                event.endTime = new Date(event.endTime);
              }

              this.eventSource = events;
              this.daysWorked(events);
            }
          });
      });
    });
  }

  calendarDateClicked(shift) {
    this.stop = true;
    this.eventsAdded = this.eventsAdded + 1;

    if (this.eventsAdded != 0 && this.eventsAdded % 4 === 0) {
      this.launchInterstitial();
    }

    const eventData = {
      startTime: new Date(this.selectedDay),
      endTime: new Date(this.selectedDay),
      allDay: true,
      shift: shift
    };

    if (this.eventValid(eventData)) {
      this.addEvent(eventData);
    } else {
      alert(
        "This is outside the current pay period  " +
          this.beginningDate +
          " - " +
          this.currentPayPeriod.endingDate
      );
    }
  }

  eventValid(eventData) {
    const endingDate = new Date(this.endingDate);
    const endingDateHours = endingDate.setHours(endingDate.getHours() + 12);
    const beginningDate = new Date(this.beginningDate);
    const beginningDateHours = beginningDate.setHours(
      beginningDate.getHours() + 12
    );

    if (
      eventData.startTime.getTime() >= beginningDateHours &&
      eventData.endTime.getTime() <= endingDateHours
    ) {
      return true;
    }
    return false;
  }

  getSelectedDaysEvents() {
    const currentSelectedDay = new Date(this.selectedDay);
    return this.eventSource.filter(
      event => event.startTime.getTime() === currentSelectedDay.getTime()
    );
  }

  addEvent(eventData) {
    let tempArray = [];
    const currentSelectedDay = new Date(this.selectedDay);
    const currentEvents = this.getSelectedDaysEvents();
    let eventExists = false;
    tempArray = this.eventSource;

    for (let i = 0; i < currentEvents.length; i++) {
      if (eventData.shift != 'doctor' && currentEvents[i].shift == 'doctor') {
        tempArray = currentEvents.filter(
          event => event.shift !== 'doctor'
        );
        let remainingEvents = this.eventSource.filter(
          event =>
            event.startTime.getTime() !== currentEvents[i].startTime.getTime()
        );
        tempArray = remainingEvents.concat(tempArray);
      } else if (currentEvents[i].shift === eventData.shift) {
        tempArray = currentEvents.filter(
          event => event.shift !== currentEvents[i].shift
        );
        let remainingEvents = this.eventSource.filter(
          event =>
            event.startTime.getTime() !== currentEvents[i].startTime.getTime()
        );
        tempArray = remainingEvents.concat(tempArray);
        eventExists = true;
      }
    }

    if (currentEvents.length > 2 && !eventExists) {
      alert("Only 3 shifts can be applied per day!");
      return false;
    }

    if (eventData.shift === "doctor") {
      const doctor = this.eventSource.filter(
        event => event.startTime.getTime() != eventData.startTime.getTime()
      );
      this.eventSource = [];

      setTimeout(() => {
        this.eventSource = doctor;
        this.eventSource.push(eventData);
        this.storage.setItem(
          this.currentPayPeriod["year"] + "",
          this.eventSource
        );
        this.daysWorked(this.eventSource);
      });
      return;
    }

    eventExists === true ? true : tempArray.push(eventData);

    this.eventSource = [];
    setTimeout(() => {
      this.eventSource = tempArray;
      this.storage.setItem(
        this.currentPayPeriod["year"] + "",
        this.eventSource
      );
      this.daysWorked(this.eventSource);
    });
  }

  clearWorkDay() {
    const clearedEvents = this.eventSource.filter(
      event => event.startTime.getTime() != this.selectedDay.getTime()
    );
    setTimeout(() => {
      this.eventSource = clearedEvents;
      this.storage.setItem(
        this.currentPayPeriod["year"] + "",
        this.eventSource
      );
      this.daysWorked(this.eventSource);
    });
  }

  isActive(shift) {
    for (const event of this.eventSource) {
      if (
        event.shift === shift &&
        this.selectedDay.getTime() === event.startTime.getTime()
      ) {
        return true;
      }
    }
    return false;
  }

  onViewTitleChanged(title) {
    this.viewTitle = title;
  }

  dayRemaningToWork() {
    const currentDay = new Date();
    const dd = currentDay.getDate();
    const mm = currentDay.getMonth() + 1; //January is 0!

    const yyyy = currentDay.getFullYear();

    const today = mm + "/" + dd + "/" + yyyy;

    const b = moment(new Date(today));
    const a = moment(new Date(this.currentPayPeriod.endingDate));

    this.daysRemaining = a.diff(b, "days");
  }

  onTimeSelected(ev) {
    this.selectedDay = ev.selectedTime;
  }

  daysWorked(events) {
    const endingDate = new Date(this.endingDate);
    const endingDateHours = endingDate.setHours(endingDate.getHours() + 12);
    const beginningDate = new Date(this.beginningDate);
    const beginningDateHours = beginningDate.setHours(
      beginningDate.getHours() + 12
    );

    const eventsAfterBeginningDate = events.filter(
      event => event.startTime.getTime() >= beginningDateHours
    );

    this.totalDaysWorked = eventsAfterBeginningDate.filter(
      event => event.endTime.getTime() <= endingDateHours
    );

    this.daysThatMustBeWorked(this.totalDaysWorked.length);
  }

  daysThatMustBeWorked(totalDaysWorked) {
    this.requiredDaysToWork = this.currentPayPeriod.numberOfWeeks * 5;
    this.array = Array(this.requiredDaysToWork - 1)
      .fill(0)
      .map((x, i) => i + 1);
    this.mustWorkDays =
      this.requiredDaysToWork - totalDaysWorked <= 0
        ? 0
        : this.requiredDaysToWork - totalDaysWorked;
  }

  launchInterstitial() {
    let interstitialConfig: AdMobFreeInterstitialConfig = {
      // isTesting: true, // Remove in production
      autoShow: true,
      id: "ca-app-pub-5742208320359495/9514895119"
    };

    this.admobFree.interstitial.config(interstitialConfig);

    this.admobFree.interstitial.prepare().then(() => {
      // success
    });
  }

  // addColor(date) {
  //   var dateString = date;
  //     dateString = new Date(dateString).toUTCString();
  //     dateString = dateString.split(' ').slice(0, 4).join(' ');
  //   if (dateString >= new Date(this.beginningDate).toUTCString().split(' ').slice(0, 4).join(' ') && dateString <= new Date(this.endingDate).toUTCString().split(' ').slice(0, 4).join(' ')) {
  //     return true;
  //   }
  // }

  addColor(date) {
    console.log(this.stop)
    if (!this.stop) {
      var newBeginningDate = new Date(this.beginningDate).toUTCString().split(' ').slice(0, 4).join(' ')
      var newEndingDate = new Date(this.endingDate).toUTCString().split(' ').slice(0, 4).join(' ')
      var newDate = new Date(date).toUTCString().split(' ').slice(0, 4).join(' ')
      if (new Date(newDate) >= new Date(newBeginningDate) && new Date(newDate) <= new Date(newEndingDate)) {
        return true;
      }
    }
  }
    
}
