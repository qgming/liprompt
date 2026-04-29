<script>
	import { bootstrapRemoteData } from './data/bootstrap.js'

	export default {
		onLaunch: function() {
			uni.showLoading({
				title: '正在加载提示词',
				mask: true
			})
			bootstrapRemoteData().then((result) => {
			}).catch((error) => {
				console.error('统一加载提示词失败', error)
				uni.showToast({
					title: '提示词加载失败',
					icon: 'none'
				})
			}).finally(() => {
				uni.hideLoading()
			})
		},
		onShow: function() {
		},
		onHide: function() {
		}
	}
</script>

<style>
	/*每个页面公共css */
</style>
