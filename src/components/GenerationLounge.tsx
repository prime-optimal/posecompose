import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
	Zap,
	Sparkles,
	Image,
	Wand2,
	Gift,
	Star,
	AlertTriangle,
	Loader2,
} from 'lucide-react'
import { CostumePreset } from '@/types/costume'
import { CostumePresetV2 } from '@/types/costume-v2'
import { logEvent, logError } from '@/lib/logger'
import { NanoGptProviderV2, type NanoGptModel } from '@/lib/ai'
import { AIGenerationService } from '@/lib/ai/ai-generation-service'

interface GenerationLoungeProps {
  selectedCostume: CostumePreset | CostumePresetV2
  userEmail?: string
  selfieBase64?: string | null
  uploadedSelfie?: File | null
  onComplete: (imageUrl: string) => void
}

interface GenerationProgress {
  stage: string
  progress: number
  message: string
  icon: React.ReactNode
}

const SUPPORTED_MODELS: NanoGptModel[] = ['seedream-v4', 'google:4@1', 'background-remover']

const getDefaultNanoGptModel = (): NanoGptModel => {
	const envModel = import.meta.env.VITE_DEFAULT_MODEL
	if (envModel && SUPPORTED_MODELS.includes(envModel as NanoGptModel)) {
		return envModel as NanoGptModel
	}
	return 'seedream-v4'
}


type GenerationStatus = 'idle' | 'running' | 'error' | 'success' | 'config-missing'

export const GenerationLounge = ({
	selectedCostume,
	userEmail,
	selfieBase64,
	uploadedSelfie,
	onComplete,
}: GenerationLoungeProps) => {
	const provider = useMemo(() => new NanoGptProviderV2(), [])
	const [status, setStatus] = useState<GenerationStatus>('idle')
	const [attempt, setAttempt] = useState(0)
	const [currentStage, setCurrentStage] = useState(0)
	const [progress, setProgress] = useState(5)
	const [estimatedTime, setEstimatedTime] = useState(
		selectedCostume.metadata.estimatedProcessingTime,
	)
	const [errorMessage, setErrorMessage] = useState<string | null>(null)

	const stages: GenerationProgress[] = useMemo(
		() => [
			{
				stage: 'References',
				progress: 10,
				message: 'Preparing costume references...',
				icon: <Image className="w-4 h-4" />,
			},
			{
				stage: 'Upload',
				progress: 35,
				message: 'Sending your selfie to the Nano GPT atelier...',
				icon: <Zap className="w-4 h-4" />,
			},
			{
				stage: 'Generation',
				progress: 70,
				message: `Weaving the ${selectedCostume.name} look...`,
				icon: <Wand2 className="w-4 h-4" />,
			},
			{
				stage: 'Polish',
				progress: 90,
				message: 'Adding finishing sparkles...',
				icon: <Sparkles className="w-4 h-4" />,
			},
			{
				stage: 'Complete',
				progress: 100,
				message: 'Your transformation is ready!',
				icon: <Star className="w-4 h-4" />,
			},
		],
		[selectedCostume.name],
	)

	useEffect(() => {
		logEvent('generation_lounge_entered', {
			costumeId: selectedCostume.id,
			costumeName: selectedCostume.name,
			userEmail: userEmail || 'guest',
		})
	}, [selectedCostume.id, selectedCostume.name, userEmail])

	useEffect(() => {
	setEstimatedTime(selectedCostume.metadata.estimatedProcessingTime)
	setProgress(5)
	setCurrentStage(0)
}, [selectedCostume.id, attempt, selectedCostume.metadata.estimatedProcessingTime])

	useEffect(() => {
		if (status !== 'running') {
			return
		}

		const interval = setInterval(() => {
			setProgress(prev => {
				const target = stages[stages.length - 2]?.progress ?? 90
				if (prev >= target) {
					return prev
				}
				return Math.min(target, prev + 3)
			})
		}, 900)

		return () => clearInterval(interval)
	}, [status, stages])

	useEffect(() => {
		const thresholdIndex = stages.findIndex(stage => progress < stage.progress)
		const nextStage =
			thresholdIndex === -1
				? stages.length - 1
				: Math.max(0, thresholdIndex - 1)

		setCurrentStage(prev => (prev === nextStage ? prev : nextStage))
	}, [progress, stages])

	useEffect(() => {
		if (status !== 'running') {
			return
		}
		const timer = setInterval(() => {
			setEstimatedTime(prev => (prev > 0 ? prev - 1 : 0))
		}, 1000)
		return () => clearInterval(timer)
	}, [status])

	useEffect(() => {
		if (!provider.isConfigured()) {
			setStatus('config-missing')
			return
		}

		let isCancelled = false
		const model = getDefaultNanoGptModel()

		const executeGeneration = async () => {
			setStatus('running')
			setErrorMessage(null)
			setProgress(10)

			// Convert to V2 format if needed
			const costumeV2: CostumePresetV2 = 'aiGeneration' in selectedCostume
				? selectedCostume as CostumePresetV2
				: {
					...selectedCostume,
					aiGeneration: {
						model: 'seedream-v4',
						seed: 42,
						primaryPrompt: selectedCostume.transformation.base,
						fallbackPrompt: selectedCostume.transformation.base,
						negativePrompt: selectedCostume.transformation.negativePrompts?.join(', '),
						steps: 20,
						resolution: '1024x1024',
						showExplicitContent: false,
						numOutputs: 1,
						referenceStrategy: 'priority-order',
						maxReferences: 4,
						primaryReferenceIds: [],
						qualityModifiers: selectedCostume.transformation.qualityModifiers || [],
						styleEnhancements: selectedCostume.transformation.detailEnhancements || [],
						modelOptions: {}
					}
				}

			const aiRequest = AIGenerationService.buildRequest({
				costume: costumeV2,
				selfieBase64,
				selfieMimeType: uploadedSelfie?.type ?? null,
				model: getDefaultNanoGptModel(),
				includeFallback: true,
			})

			try {

	logEvent('generation_prompt_composed', {
		costumeId: selectedCostume.id,
		costumeName: selectedCostume.name,
		model: aiRequest.model,
		prompt: aiRequest.prompt,
		negativePrompt: aiRequest.negativePrompt,
		includesUserSelfie: aiRequest.references.some(reference => reference.role === 'user'),
		userSelfieKind: aiRequest.references.find(reference => reference.role === 'user')?.kind ?? null,
		userSelfieBytes:
			aiRequest.references
				.find(reference => reference.role === 'user' && reference.kind === 'base64')?.value
				?.length ?? null,
		costumeReferenceCount: aiRequest.references.filter(reference => reference.role === 'costume').length,
		referenceSummary: aiRequest.references.map(reference => ({
			id: reference.id,
			role: reference.role,
			kind: reference.kind,
			hasInlineData: reference.kind === 'base64',
			inlineLength: reference.kind === 'base64' ? reference.value.length : null,
			mimeType: reference.mimeType ?? null,
			value: reference.kind === 'url' ? reference.value : undefined,
		})),
	})

				logEvent('generation_request_dispatched', {
					costumeId: selectedCostume.id,
					model: aiRequest.model,
					references: aiRequest.references.length,
					attempt,
				})

			const response = await provider.generateImage(aiRequest)

				if (isCancelled) {
					return
				}

				const primaryImage = response.images[0]
				if (!primaryImage) {
					throw new Error('Nano GPT did not return any images')
				}

				const imageUrl = primaryImage.base64
					? `data:image/png;base64,${primaryImage.base64}`
					: primaryImage.url

				if (!imageUrl) {
					throw new Error('Nano GPT response missing usable image data')
				}

				setProgress(100)
				setStatus('success')
				setCurrentStage(stages.length - 1)

				logEvent('generation_completed', {
					costumeId: selectedCostume.id,
					costumeName: selectedCostume.name,
					model: aiRequest.model,
					referenceCount: aiRequest.references.length,
					attempt,
				})

				onComplete(imageUrl)
			} catch (error) {
				if (isCancelled) {
					return
				}

				const message =
					error instanceof Error
						? error.message
						: 'Unexpected error while generating your transformation'

				setStatus('error')
				setErrorMessage(message)
				logError('generation_failed', error, {
					costumeId: selectedCostume.id,
					model: getDefaultNanoGptModel(),
					attempt,
					references: selfieBase64 ? 'selfie+catalog' : 'catalog-only',
				})
				toast.error('Aw, the magic fizzled. Try again in a moment!')
			}
		}

		executeGeneration()

		return () => {
			isCancelled = true
		}
	}, [attempt, onComplete, provider, selectedCostume, selfieBase64, stages.length, uploadedSelfie])

	useEffect(() => {
	const stage = stages[currentStage]
	if (!stage || status === 'config-missing') {
		return
	}

		logEvent('generation_stage_updated', {
			stage: stage.stage,
			progress,
			costumeId: selectedCostume.id,
			status,
		})
	}, [currentStage, stages, progress, selectedCostume.id, status])

	const handleRetry = useCallback(() => {
		logEvent('generation_retry_requested', {
			costumeId: selectedCostume.id,
			attempt: attempt + 1,
		})
		setProgress(5)
		setCurrentStage(0)
		setEstimatedTime(selectedCostume.metadata.estimatedProcessingTime)
		setAttempt(prev => prev + 1)
	}, [attempt, selectedCostume.id, selectedCostume.metadata.estimatedProcessingTime])

	return (
		<div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
			<div className="text-center space-y-2">
				<div className="flex justify-center">
					<div className="p-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full animate-pulse">
						<Wand2 className="w-8 h-8 text-white" />
					</div>
				</div>
				
				<div className="space-y-1">
					<h2 className="text-2xl font-bold gradient-text">
						Magic in Progress ✨
					</h2>
					<p className="text-muted-foreground">
						{status === 'config-missing'
							? 'Add your Nano GPT credentials to continue your transformation'
							: `Transforming into ${selectedCostume.name}...`}
					</p>
				</div>

				<div className="flex items-center justify-center gap-2">
					{status === 'running' && (
						<div className="flex items-center gap-1">
							<Loader2 className="w-4 h-4 text-primary animate-spin" />
							<span className="text-sm text-muted-foreground">
								{estimatedTime}s remaining
							</span>
						</div>
					)}

					{status === 'config-missing' && (
						<div className="flex items-center gap-1 text-amber-700">
							<AlertTriangle className="w-4 h-4" />
							<span className="text-sm">API key required</span>
						</div>
					)}
				</div>
      </div>

      {/* Progress */}
      <Card className="p-6">
        <div className="space-y-4">
          {status !== 'config-missing' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Transformation Progress</span>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {status === 'config-missing' && (
            <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-left">
              <AlertTriangle className="w-5 h-5 text-amber-700" />
              <div className="space-y-1 text-sm text-amber-800">
                <p className="font-medium">Nano GPT configuration required</p>
                <p>
                  Add <code className="font-mono">VITE_NANO_GPT_API_KEY</code>
                  {" "}and optionally <code className="font-mono">VITE_NANO_GPT_BASE_URL</code> to
                  enable live transformations. Fallback mock assets will be used until
                  configured.
                </p>
              </div>
            </div>
          )}

          {status !== 'config-missing' && (
            <div className="space-y-3">
              {stages.map((stage, index) => (
                <div
                  key={stage.stage}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
                    index <= currentStage
                      ? index === currentStage
                        ? 'bg-primary/10 border border-primary/25'
                        : 'bg-muted/50'
                      : 'opacity-50'
                  }`}
                >
                  <div
                    className={`p-2 rounded-full ${
                      index <= currentStage
                        ? index === currentStage
                          ? 'bg-primary animate-pulse'
                          : 'bg-primary/50'
                        : 'bg-muted'
                    }`}
                  >
                    {stage.icon}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span
                        className={`font-medium ${
                          index <= currentStage ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {stage.stage}
                      </span>
                      {index <= currentStage && (
                        <span className="text-xs text-muted-foreground">
                          {stage.progress}%
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {stage.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {status === 'error' && errorMessage && (
            <div className="rounded-lg border border-rose-300 bg-rose-50 p-4 text-rose-800">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-semibold">Magic fizzled!</span>
              </div>
              <p className="text-sm mb-3">{errorMessage}</p>
              <Button variant="outline" onClick={handleRetry}>
                Try again
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Costume Info */}
      <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center">
            <span className="text-2xl">🎭</span>
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{selectedCostume.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedCostume.marketing.shortDescription}
            </p>
            
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedCostume.metadata.tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Fun Facts */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Did You Know?
        </h3>
        
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            🎃 Over 10,000 people have transformed themselves this Halloween season
          </p>
          <p>
            🤖 Our AI analyzes over 100 facial features to create the perfect fit
          </p>
          <p>
            ✨ Each transformation is unique - no two are exactly alike!
          </p>
          <p>
            🎁 New costume collections drop every week for our community members
          </p>
        </div>
      </Card>

      {/* Affiliate Links */}
      {selectedCostume.affiliateLinks.length > 0 && (
        <Card className="p-6 bg-gradient-to-r from-purple-100 to-pink-100 border-purple-300">
          <div className="space-y-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Gift className="w-5 h-5 text-purple-600" />
                <h4 className="font-semibold text-purple-900">Complete Your IRL Look!</h4>
              </div>
              <p className="text-sm text-purple-800">
                Transform your AI creation into reality with authentic costumes
              </p>
            </div>
            
            <div className="space-y-3">
              {selectedCostume.affiliateLinks.map(link => (
                <div 
                  key={link.id}
                  className="bg-white/50 backdrop-blur-sm rounded-lg p-3 border border-purple-200 hover:bg-white/70 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-2 py-1 bg-purple-600 text-white rounded font-medium">
                          {link.source}
                        </span>
                        {link.availability === 'in-stock' && (
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded font-medium">
                            In Stock
                          </span>
                        )}
                        {link.availability === 'pre-order' && (
                          <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded font-medium">
                            Pre-Order
                          </span>
                        )}
                        {link.price && (
                          <span className="text-sm font-bold text-purple-900">
                            {link.price}
                          </span>
                        )}
                      </div>
                      <h5 className="font-medium text-purple-900 text-sm">
                        {link.label}
                      </h5>
                      {link.description && (
                        <p className="text-xs text-purple-700 mt-1">
                          {link.description}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        logEvent('affiliate_link_clicked', {
                          linkId: link.id,
                          source: link.source,
                          costumeId: selectedCostume.id,
                          costumeName: selectedCostume.name,
                          price: link.price,
                          userEmail: userEmail || 'guest'
                        });
                        window.open(link.url, '_blank', 'noopener,noreferrer');
                      }}
                      className="ml-3 px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm rounded-lg transition-colors"
                    >
                      Shop →
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <h5 className="font-semibold text-amber-900 text-xs mb-2">💝 Affiliate Disclosure</h5>
              <p className="text-xs text-amber-800 leading-relaxed">
                Waifu Material contains affiliate links. When you purchase through our partner links, 
                we may earn a small commission at no additional cost to you. This helps us keep our 
                AI transformation service free for everyone. We only recommend products that enhance 
                your cosplay experience.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* User Info */}
      {userEmail && (
        <div className="text-center text-sm text-muted-foreground">
          <p>Transformation being sent to: {userEmail}</p>
        </div>
      )}
    </div>
  );
};
