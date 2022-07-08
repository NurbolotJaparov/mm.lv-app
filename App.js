
import React, { useState, useEffect, useRef } from 'react';
import { StatusBar, SafeAreaView, ScrollView, BackHandler, RefreshControl, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Progress from 'react-native-progress';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

//import { WebViewMM } from './WebViewMM';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false, 
  }),
});

function wait(timeout) {
  return new Promise(resolve => {
    setTimeout(resolve, timeout);
  });
}

export default function App() {

  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(false);
  const [refresherEnabled, setRefresherEnabled] = useState(false);
  const [progressBar, setProgressBar] = useState(0);
  const [progressBarColor, setProgressBarColor] = useState('black');
  const [defaultUrl, setDefaultUrl] = useState('https://mm.lv');

  const notificationListener = useRef();
  const responseListener = useRef();
  const webviewRef = useRef();

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => setExpoPushToken(token));

    // This listener is fired whenever a notification is received while the app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    // This listener is fired whenever a user taps on or interacts with a notification (works when app is foregrounded, backgrounded, or killed)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const url = response.notification.request.content.data.url;
      if (url){
        setDefaultUrl(response.notification.request.content.data.url)
      }
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android'){
      BackHandler.addEventListener('hardwareBackPress', onAndroidBackPress);
      return () => {
          BackHandler.removeEventListener('hardwareBackPress',onAndroidBackPress);
      };
    }
  }, []);

  const onAndroidBackPress = () => {
    if (webviewRef.current) {
      webviewRef.current.goBack();
      return true;
    }
    return false;
  }

  const hideProgressBar = () => {
    wait(300).then(function(){
      setProgressBar(0);
      setProgressBarColor('black')
    });
    
  }

  const handleScroll = (event) =>  {
    const yOffset = Number(event.nativeEvent.contentOffset.y)
    if (yOffset === 0){
      setRefresherEnabled(true);
    } else {
      setRefresherEnabled(false);
    }
  }

  const saveExpoPushToken = (event) => {
    const dataFromWeb = JSON.parse(event.nativeEvent.data);
    if (dataFromWeb.userId && expoPushToken){
      const data = new FormData();
      data.append("expoPushToken", expoPushToken);
      data.append("userId", dataFromWeb.userId);
      console.log('setToken: userId:'+dataFromWeb.userId+', token:'+expoPushToken)
      fetch('https://mm.lv/index.php?page=ajax&action=setExpoPushToken', {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'multipart/form-data',
        },
        body:data,
        })
        .catch((error) => {
          console.error(error);
        }); 
    } else {
      console.log('userId or ExpoPushToken not found');
    }
  }

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: 'black'}}>
      <StatusBar style="auto" />

      <ScrollView contentContainerStyle={{flex: 1}}
        refreshControl={
          <RefreshControl 
            colors={['#00a594']}
            refreshing={false}
            enabled={refresherEnabled}
            onRefresh={()=>{webviewRef.current.reload()}}
          />
        }>
       
        <Progress.Bar 
          progress={progressBar} 
          color={progressBarColor}
          width={null} 
          height={1} 
          borderWidth={0} 
          borderRadius={0} /> 
      
        <WebView
          ref={webviewRef}
          source={{ uri: defaultUrl}}
          forceDarkOn={false}
          pullToRefreshEnabled={true}
          renderLoading={()=>{return true}}
          allowsBackForwardNavigationGestures={true}
          onLoadProgress={({nativeEvent}) => setProgressBar(nativeEvent.progress)}
          onLoadStart={() => setProgressBarColor('#00a594')}
          onLoad={hideProgressBar}
          onScroll={handleScroll}
          onMessage={saveExpoPushToken}
          userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36" 
        />

      </ScrollView>

    </SafeAreaView>
  );
}

async function registerForPushNotificationsAsync() {
  let token;
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    token = (await Notifications.getExpoPushTokenAsync()).data;
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }      

  console.log('ExpoToken: ',token);
  return token;
}