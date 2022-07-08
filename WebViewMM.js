import React, { Component } from 'react';
import { ScrollView, BackHandler, RefreshControl, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Progress from 'react-native-progress';

function wait(timeout) {
  return new Promise(resolve => {
    setTimeout(resolve, timeout);
  });
}

export class WebViewMM extends Component {

  WEBVIEW_REF = React.createRef();
  expoPushToken = this.props.expoPushToken;

  state = {
    canGoBack: false,
    refresherEnabled: false,
    progressBar: 0,
    progressBarColor: 'black'
  };


  hideProgressBar = () => {
    wait(200).then(() => this.setState({progressBar:0,progressBarColor:'black'}));
  }

  handleScroll = (event) =>  {
    const yOffset = Number(event.nativeEvent.contentOffset.y)
    if (yOffset === 0){
      this.setState({refresherEnabled: true});
    } else {
      this.setState({refresherEnabled: false});
    }
  }

  componentDidMount() {
    if (Platform.OS === 'android') {
      BackHandler.addEventListener('hardwareBackPress', this.onAndroidBackPress);
    }
  }

  componentWillUnmount() {
    if (Platform.OS === 'android') {
      BackHandler.removeEventListener('hardwareBackPress');
    }
  }

  onAndroidBackPress = () => {
    if (this.state.canGoBack && this.WEBVIEW_REF.current) {
      this.WEBVIEW_REF.current.goBack();
      return true;
    }
    return false;
  }

  onNavigationStateChange = (navState) => {
    this.setState({
      canGoBack: navState.canGoBack,
    });
  };

  saveExpoPushToken = (event) => {
    console.log('tk=',this.expoPushToken);
    const dataFromWeb = JSON.parse(event.nativeEvent.data);
    if (dataFromWeb.userId && this.expoPushToken){
      const data = new FormData();
      data.append("expoPushToken", this.expoPushToken);
      data.append("userId", dataFromWeb.userId);

      fetch('https://mm.lv/test.php', {
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

  render() {
    return (
      <ScrollView contentContainerStyle={{flex: 1}}
        refreshControl={
          <RefreshControl 
            colors={['#00a594']}
            refreshing={false}
            enabled={this.state.refresherEnabled}
            onRefresh={()=>{this.WEBVIEW_REF.current.reload()}}
          />
        }>
       
        <Progress.Bar progress={this.state.progressBar} width={null} height={1} borderWidth={0} borderRadius={0} color={this.state.progressBarColor}/> 
      
        <WebView
          ref={this.WEBVIEW_REF}
          source={{ uri: "https://mm.lv" }}
          forceDarkOn={false}
          pullToRefreshEnabled={true}
          renderLoading={()=>{return true}}
          allowsBackForwardNavigationGestures={true}
          onNavigationStateChange={this.onNavigationStateChange}
          onLoadProgress={({nativeEvent}) => this.setState({progressBar:nativeEvent.progress})}
          onLoadStart={() => this.setState({progressBarColor:'#00a594'})}
          onLoad={this.hideProgressBar}
          onScroll={this.handleScroll}
          onMessage={this.saveExpoPushToken}
          userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36" 
        />
      </ScrollView>
    );
  }
}
