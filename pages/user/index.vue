<template>
  <view class="container">
    <view class="user-card">
      <view class="user-info">
        <image class="avatar"
          src="https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0"
          mode="aspectFill"></image>
        <text class="nickname">用户</text>
      </view>
    </view>
  </view>
</template>

<script setup>
// 简化的用户页面
</script>

<style>
.container {
  position: relative;
  height: 100vh;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-card {
  position: relative;
  margin: 30rpx;
  padding: 40rpx;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.1);
  width: 80%;
  max-width: 600rpx;
}

.user-info {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.avatar {
  width: 150rpx;
  height: 150rpx;
  border-radius: 50%;
  border: none;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.1);
  margin-bottom: 20rpx;
}

.nickname {
  font-size: 32rpx;
  color: #333;
  font-weight: 500;
}
</style>