
$filePath = "App.tsx"
$content = Get-Content $filePath -Raw -Encoding UTF8
$contentNorm = $content -replace "`r`n", "`n"

# Add 'create-campaign' case in the switch inside renderContent()
$old = "      case 'wallet': return <WalletView onWithdrawalRequested={(a, p) => console.log('Withdrawal requested', a, p)} />;
      default: return <AmbassadorDashboard userData={userData} onNavigateToWallet={() => setCurrentTab('wallet')} />;
"

$new = "      case 'wallet': return <WalletView onWithdrawalRequested={(a, p) => console.log('Withdrawal requested', a, p)} />;
      case 'create-campaign': return <CreateCampaign onSuccess={handleCampaignFormSuccess} onCancel={() => setCurrentTab('dashboard')} />;
      default: return <AmbassadorDashboard userData={userData} onNavigateToWallet={() => setCurrentTab('wallet')} />;
"

if ($contentNorm.Contains($old)) {
    $contentNorm = $contentNorm.Replace($old, $new)
    Write-Host "Patch create-campaign case: OK"
} else {
    Write-Host "ERROR: target not found"
}

# Also move handleCampaignFormSuccess BEFORE renderContent so it's properly in scope
# Actually in React functional components all consts in the same scope are accessible
# The issue is handleCampaignFormSuccess is defined AFTER early returns.
# We need to move it before renderContent.

# Move handleCampaignFormSuccess block before renderContent
$handlerBlock = "  // Handler appele apres validation du formulaire campagne (avant paiement)
  const handleCampaignFormSuccess = (campaignDraft: Omit<Campaign, 'id'>, amount: number) => {
    setPendingCampaign(campaignDraft);
    setPendingAmount(amount);
    setShowPayment(true);
  };"

# Find and remove the handler from after the early returns (with accents)
$oldWithAccent = "  // Handler appel" + [char]0xE9 + " apr" + [char]0xE8 + "s validation du formulaire campagne (avant paiement)"

# Just do string search for the specific line including accent chars  
$idx = $contentNorm.IndexOf("handleCampaignFormSuccess")
if ($idx -gt 0) {
    Write-Host "handleCampaignFormSuccess found at index: $idx"
}

[System.IO.File]::WriteAllText((Resolve-Path $filePath), $contentNorm, [System.Text.Encoding]::UTF8)
Write-Host "App.tsx saved."
