const awsConfig = {
  Auth: {
    region: 'ap-northeast-1', // Cognito User Pool のリージョン
    aws_cognito_identity_pool_id: 'ap-northeast-1:7727559a-ac75-4f77-beee-12434a827325', // Identity Pool ID
    userPoolId: 'ap-northeast-1_L66IlXJxw', // User Pool ID
    userPoolWebClientId: '4ua0jvrlfae85d932ogs02s5lh', // App Client ID
    oauth: {
      domain: 'https://ijindeck.auth.ap-northeast-1.amazoncognito.com', // ドメイン名
      scope: ['openid'], // 必要なスコープ
      redirectSignIn: 'http://localhost:3000/', // サインイン後のリダイレクト先
      redirectSignOut: 'http://localhost:3000/', // サインアウト後のリダイレクト先
      responseType: 'code', // Authorization Code Grant を使用
    },
  },
};

export default awsConfig;
